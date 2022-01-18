#include "uvcCamCtrl.h"
#include "AddTimeStamp.h" // dont know why no effect...

/*
Below 2-enum are out of DShow spec, however, we can find them on Microsoft UVC driver page.
The upper 1 should be using with Pro amp api and the other using with camera control API. 
KSPROPERTY_VIDEOPROCAMP_POWERLINE_FREQUENCY = 13
KSPROPERTY_CAMERACONTROL_AUTO_EXPOSURE_PRIORITY = 19
*/

namespace uvcCamCtrl
{
	using v8::Context;
	using v8::FunctionCallbackInfo;
	using v8::Isolate;
	using v8::Local;
	using v8::Object;
	using v8::String;
	using v8::Value;

#pragma warning(disable : 4996)
//#pragma comment (lib, "cfgmgr32.lib")
#pragma comment(lib, "strmiids.lib") 

 // Add time stamp to observe
AddTimeStamp ats(std::cout);


// Release the format block for a media type.
void _FreeMediaType(AM_MEDIA_TYPE& mt)
{
    if (mt.cbFormat != 0)
    {
        CoTaskMemFree((PVOID)mt.pbFormat);
        mt.cbFormat = 0;
        mt.pbFormat = NULL;
    }
    if (mt.pUnk != NULL)
    {
        // pUnk should not be used.
        mt.pUnk->Release();
        mt.pUnk = NULL;
    }
}

// Delete a media type structure that was allocated on the heap.
void _DeleteMediaType(AM_MEDIA_TYPE* pmt)
{
    if (pmt != NULL)
    {
        _FreeMediaType(*pmt);
        CoTaskMemFree(pmt);
    }
}

std::string ConvertWCSToMBS(const wchar_t* pstr, long wslen)
{
    int len = ::WideCharToMultiByte(CP_ACP, 0, pstr, wslen, NULL, 0, NULL, NULL);

    std::string dblstr(len, '\0');
    len = ::WideCharToMultiByte(CP_ACP, 0 /* no flags */,
        pstr, wslen /* not necessary NULL-terminated */,
        &dblstr[0], len,
        NULL, NULL /* no default char */);

    return dblstr;
}

std::string ConvertBSTRToMBS(BSTR bstr)
{
    int wslen = ::SysStringLen(bstr);
    return ConvertWCSToMBS((wchar_t*)bstr, wslen);
}

//-----------------------------------------------------------------------------
void* buf_alloc(int size)
{
    void* buf;

    if (NULL == (buf = malloc(size)))
        std::cout << "Out of memory! \n";
        //error_exit("out of memory");

    return buf;
}

//-----------------------------------------------------------------------------
void buf_free(void* buf)
{
    free(buf);
}

// Normalize the devPath got from obs-studio-node so that we can compare with devices what we enumerated
// by DShow or SetupDiXXXXXX 
static std::string reSortDevPath(std::string inputStr)
{
    std::string outStr = inputStr;
    //int pos = inputStr.find_first_not_of("\\\\?\\");

    // Remove the device name
    std::size_t found = outStr.find("\\\\?\\");
    if (found != std::string::npos)
    {
        //std::cout << "first '\\\\?\\' found at: " << found << '\n';
        outStr = outStr.substr(found, outStr.length() - found);
        //std::cout << "After cut...: " << outStr << '\n';
    }

    // Remove the '22' (it's dangerous but)
    while(1)
    {
        found = outStr.find("#22");
        if (found != std::string::npos)
        {
            outStr = outStr.erase(found + 1, 2);
        }
        else
            break;
    }
    std::cout << "After resorted the string: " << outStr << '\n';

    return outStr;
}

void getKGTCamRange(const Nan::FunctionCallbackInfo<v8::Value>& info)
{
	std::cout << "UVCCamCtrl - getKGTCamRange()";
	
	v8::Isolate* isolate = info.GetIsolate();
	v8::String::Utf8Value str(isolate, info[0]);
	std::string strArg0 = *str;
	//std::cout << "getKGTCamRange() - the input param value: " << strArg0 << "\r\n";
    strArg0 = reSortDevPath(strArg0);

    v8::String::Utf8Value str1(isolate, info[1]);
	std::string strArg1 = *str1;
	//std::cout << "getKGTCamRange() - the asked item: " << strArg1 << "\r\n";

    // for playing
    IGraphBuilder* pGraphBuilder;
    ICaptureGraphBuilder2* pCaptureGraphBuilder2;
    //IMediaControl* pMediaControl;
    IBaseFilter* pDeviceFilter = NULL;

    // to select a video input device
    ICreateDevEnum* pCreateDevEnum = NULL;
    IEnumMoniker* pEnumMoniker = NULL;
    IMoniker* pMoniker = NULL;
    ULONG nFetched = 0;

    // initialize COM
    //CoInitialize(nullptr);

    //------------------------- selecting a device--------------------------//
    // Create CreateDevEnum to list device
    CoCreateInstance(CLSID_SystemDeviceEnum, NULL, CLSCTX_INPROC_SERVER,
        IID_ICreateDevEnum, (PVOID*)&pCreateDevEnum);

    // Create EnumMoniker to list VideoInputDevice 
    pCreateDevEnum->CreateClassEnumerator(CLSID_VideoInputDeviceCategory, &pEnumMoniker, 0);
    if (pEnumMoniker == NULL) {
        // this will be shown if there is no capture device
        std::cout << "no device \r\n";
        return; // vv20211021 TBD: here we should collect wrong information then return
    }

    // reset EnumMoniker
    pEnumMoniker->Reset();

    // get each Moniker
    while (pEnumMoniker->Next(1, &pMoniker, &nFetched) == S_OK) {
        IPropertyBag* pPropertyBag;
        //TCHAR devname[256];
        LPSTR devname1 = NULL;

        // bind to IPropertyBag
        pMoniker->BindToStorage(0, 0, IID_IPropertyBag, (void**)&pPropertyBag);

        VARIANT varDevPath;
        VARIANT varName;
		VariantInit(&varDevPath);
        VariantInit(&varName);

        // get FriendlyName
        pPropertyBag->Read(L"FriendlyName", &varName, 0);
        std::string strFName = ConvertBSTRToMBS(varName.bstrVal);
		std::cout << strFName << "\r\n"; // show friendly name
        //VariantClear(&varName);

        // vv - we can take advantage of this to identify each camera if there is no serial number embedded in camera itself.
        // MSDN: https://docs.microsoft.com/en-us/windows/win32/directshow/selecting-a-capture-device
        // DevicePath - The "DevicePath" property is not a human-readable string, but is guaranteed to be unique 
        // for each video capture device on the system. 
        // You can use this property to distinguish between two or more instances of the same model of device.
		if(SUCCEEDED(pPropertyBag->Read(L"DevicePath", &varName, 0))) // read dev-path
		{
			// The device path is not intended for display.
			//std::cout << "uvcCamCtrl - getKGTCamRange() -  Device path: " << varName.bstrVal << "\r\n";
            strFName = ConvertBSTRToMBS(varName.bstrVal);
		    //std::cout << "uvcCamCtrl - getKGTCamRange() - strFName from Device path: " << strFName << "\r\n";
		}
		else
        {
            std::cout << "uvcCamCtrl - getKGTCamValue(): Error occured!!\r\n";		
        }
		// Get device by vid and pid
		//if(strFName.find(strVid) != std::string::npos &&
		//	strFName.find(strPid) != std::string::npos) 
        // vv20211027 compare the whole dev-path
        if(strFName.compare(strArg0) == 0) 
		{
			std::cout << "-------------uvcCamCtrl - getKGTCamValue() - DShow got Kensington webcam. Now start getting range.---------- \r\n";
			// Bind Monkier to Filter
			pMoniker->BindToObject(0, 0, IID_IBaseFilter, (void**)&pDeviceFilter);
		}

        // release
        pMoniker->Release();
        pPropertyBag->Release();

        if (pDeviceFilter != NULL) {
            break;
        }
    }

    if (pDeviceFilter != NULL) {
        //
        // PLAY
        //
        // create FilterGraph
        CoCreateInstance(CLSID_FilterGraph,
            NULL,
            CLSCTX_INPROC,
            IID_IGraphBuilder,
            (LPVOID*)&pGraphBuilder);

        // create CaptureGraphBuilder2
        CoCreateInstance(CLSID_CaptureGraphBuilder2, NULL, CLSCTX_INPROC,
            IID_ICaptureGraphBuilder2,
            (LPVOID*)&pCaptureGraphBuilder2);

        //============================================================
        //===========  MY CODE  ======================================
        //=============================================================
        //HRESULT hr = CoInitialize(0);
        IAMStreamConfig* pConfig = NULL;
        HRESULT hr = pCaptureGraphBuilder2->FindInterface(&PIN_CATEGORY_CAPTURE, 0, pDeviceFilter,
                                             IID_IAMStreamConfig, (void**)&pConfig);
        #if 0
        int iCount = 0, iSize = 0;        
        hr = pConfig->GetNumberOfCapabilities(&iCount, &iSize);

        // Check the size to make sure we pass in the correct structure.
        if (iSize == sizeof(VIDEO_STREAM_CONFIG_CAPS))
        {
            // Use the video capabilities structure.
            for (int iFormat = 0; iFormat < iCount; iFormat++)
            {
                VIDEO_STREAM_CONFIG_CAPS scc;
                AM_MEDIA_TYPE* pmtConfig;
                hr = pConfig->GetStreamCaps(iFormat, &pmtConfig, (BYTE*)&scc);
                if (SUCCEEDED(hr))
                {
                    /* Examine the format, and possibly use it. */
                    if ((pmtConfig->majortype == MEDIATYPE_Video) &&
                        (pmtConfig->subtype == MEDIASUBTYPE_RGB24) &&
                        (pmtConfig->formattype == FORMAT_VideoInfo) &&
                        (pmtConfig->cbFormat >= sizeof(VIDEOINFOHEADER)) &&
                        (pmtConfig->pbFormat != NULL))
                    {
                        VIDEOINFOHEADER* pVih = (VIDEOINFOHEADER*)pmtConfig->pbFormat;
                        // pVih contains the detailed format information.
                        LONG lWidth = pVih->bmiHeader.biWidth;
                        LONG lHeight = pVih->bmiHeader.biHeight;
                    }
                    if (iFormat == 26) { //2 = '1280x720YUV' YUV, 22 = '1280x800YUV', 26 = '1280x720RGB'
                        hr = pConfig->SetFormat(pmtConfig);
                    }
                    // Delete the media type when you are done.
                    _DeleteMediaType(pmtConfig);
                }
            }
        }
        #endif
        long Min = 0, Max = 0, Step = 0, Default = 0, Flags = 0;//, Val;
        int iSel = 0;
        // Control category
        if (strArg1 == "CameraControl_Pan"          ||
            strArg1 == "CameraControl_Tilt"         ||
            strArg1 == "CameraControl_Roll"         ||
            strArg1 == "CameraControl_Zoom"         ||
            strArg1 == "CameraControl_Exposure"     ||
            strArg1 == "CameraControl_Iris"         ||
            strArg1 == "CameraControl_Focus"        ||
            strArg1 == "CameraControl_LowLightCompensation"
        )
        {
            // Query the capture filter for the IAMCameraControl interface.
            IAMCameraControl* pCameraControl = 0;
            hr = pDeviceFilter->QueryInterface(IID_IAMCameraControl, (void**)&pCameraControl);
            if (FAILED(hr))
            {
                // The device does not support IAMCameraControl
                std::cout << "The device does not support IAMCameraControl" << "\r\n";
            }
            else
            {
                if(strArg1 == "CameraControl_Pan")              iSel = 0;
                else if(strArg1 == "CameraControl_Tilt")        iSel = 1;
                else if(strArg1 == "CameraControl_Roll")        iSel = 2;
                else if(strArg1 == "CameraControl_Zoom")        iSel = 3;
                else if(strArg1 == "CameraControl_Exposure")    iSel = 4;
                else if(strArg1 == "CameraControl_Iris")        iSel = 5;
                else if(strArg1 == "CameraControl_Focus")       iSel = 6;
                else if(strArg1 == "CameraControl_LowLightCompensation") iSel = 19; // Only the default making-sense
                //else if (strArg1 == "CameraControl_LowLightCompensation") iSel = 4; // read exposure first

                // vv20211129 When input parameter is low light compensation, return auto exposure's flag
                if (strArg1 == "CameraControl_LowLightCompensation")
                {
                    //long Val = 0;
                    //long retain_AutoExposure = 0;
                    //hr = pCameraControl->Get(iSel, &Val, &Flags);
                    //if (SUCCEEDED(hr))
                    //{
                    //    retain_AutoExposure = Flags;
                    //    iSel = 19;
                        hr = pCameraControl->GetRange(iSel, &Min, &Max, &Step, &Default, &Flags);
                        if(SUCCEEDED(hr))
                        {
                            Flags = 3; // Special protocol for low light compensation
                        }
                        else
                            std::cout << "Low light is not supported for this device!!" << "\r\n";
                    //}
                    //Flags = retain_AutoExposure; // replace the flag which got when querying low light by auto-exposure's
                }
                else
                {
                    // Get the range and default values 
                    hr = pCameraControl->GetRange(iSel, &Min, &Max, &Step, &Default, &Flags);
                    if (SUCCEEDED(hr))
                    {
                        // function is succeed        
                    }
                }
                // Step: the minimun value user can adjust
                // Flags: 1 - can auto, 2 - can manual, 3 - both
                std::cout << "The requested inquery - " << strArg1
                    << " which value Min: " << Min
                    << ",Max: " << Max
                    << ",Step: " << Step
                    << ",Default: " << Default
                    << ",Flags: " << Flags
                    << "\r\n";
            }
            pCameraControl->Release();
        } // Video Pro Amp category
        else if (strArg1 == "VideoProcAmp_Brightness"          ||
            strArg1 == "VideoProcAmp_Contrast"                 ||
            strArg1 == "VideoProcAmp_Hue"                      ||
            strArg1 == "VideoProcAmp_Saturation"               ||
            strArg1 == "VideoProcAmp_Sharpness"                ||
            strArg1 == "VideoProcAmp_Gamma"                    ||
            strArg1 == "VideoProcAmp_ColorEnable"              ||
            strArg1 == "VideoProcAmp_WhiteBalance"             ||
            strArg1 == "VideoProcAmp_BacklightCompensation"    || 
            strArg1 == "VideoProcAmp_Gain"
        )
        {
            // The order and the number can't be changed (should be defined by macro)
            if(strArg1 == "VideoProcAmp_Brightness")                       iSel = 0;
            else if(strArg1 == "VideoProcAmp_Contrast")                    iSel = 1;
            else if(strArg1 == "VideoProcAmp_Hue")                         iSel = 2;
            else if(strArg1 == "VideoProcAmp_Saturation")                  iSel = 3;
            else if(strArg1 == "VideoProcAmp_Sharpness")                   iSel = 4;
            else if(strArg1 == "VideoProcAmp_Gamma")                       iSel = 5;
            else if(strArg1 == "VideoProcAmp_ColorEnable")                 iSel = 6;
            else if(strArg1 == "VideoProcAmp_WhiteBalance")                iSel = 7;
            else if(strArg1 == "VideoProcAmp_BacklightCompensation")       iSel = 8;
            else if(strArg1 == "VideoProcAmp_Gain")                        iSel = 9;

            // Query the capture filter for the IAMVideoProcAmp interface.
            IAMVideoProcAmp* pProcAmp = 0;
            hr = pDeviceFilter->QueryInterface(IID_IAMVideoProcAmp, (void**)&pProcAmp);
            if (FAILED(hr)) {
                std::cout << "The device does not support IAMVideoProcAmp" << "\r\n";
            }
            else
            {
                //long Min, Max, Step, Default, Flags;//, Val;
                // Get the range and default values 
                hr = pProcAmp->GetRange(iSel, &Min, &Max, &Step, &Default, &Flags);
                
                if (SUCCEEDED(hr))
                {
                    std::cout << "Got value from IAMVideoProcAmp - Min:" << Min
                    <<" ,Max: " << Max  << " ,Step:" << Step << " ,Default:" << Default << " ,Flags:" << Flags << "\r\n";
                }
                else{
                    std::cout << "The device does not support this item: " << strArg1 << "\r\n";
                    // TBD: return a false message
                }
            }
            pProcAmp->Release();
        } //ProAmp

        // Create a new empty array.
        Local<v8::Array> arr = Nan::New<v8::Array>(5);
        Nan::Set(arr, 0, Nan::New(Min));
        Nan::Set(arr, 1, Nan::New(Max));
        Nan::Set(arr, 2, Nan::New(Step));
        Nan::Set(arr, 3, Nan::New(Default));
        Nan::Set(arr, 4, Nan::New(Flags));
        info.GetReturnValue().Set(arr);
#if 0        
        // set FilterGraph
        pCaptureGraphBuilder2->SetFiltergraph(pGraphBuilder);

        // get MediaControl interface
        pGraphBuilder->QueryInterface(IID_IMediaControl,
            (LPVOID*)&pMediaControl);

        // add device filter to FilterGraph
        pGraphBuilder->AddFilter(pDeviceFilter, L"Device Filter");

        // create Graph
        pCaptureGraphBuilder2->RenderStream(&PIN_CATEGORY_CAPTURE,
            NULL, pDeviceFilter, NULL, NULL);
#endif
        // release
        //pMediaControl->Release();
        pCaptureGraphBuilder2->Release();
        pGraphBuilder->Release();
    }

    // release
    pEnumMoniker->Release();
    pCreateDevEnum->Release();

    // finalize COM
    //CoUninitialize();
}

void getKGTCamValue(const Nan::FunctionCallbackInfo<v8::Value>& info)
{
	std::cout << "UVCCamCtrl - getKGTCamValue()";

	v8::Isolate* isolate = info.GetIsolate();
	v8::String::Utf8Value str(isolate, info[0]);
	std::string strArg0 = *str;
    strArg0 = reSortDevPath(strArg0);
	//std::cout << "getKGTCamValue() - the input param value: " << strArg0 << "\r\n";

    v8::String::Utf8Value str1(isolate, info[1]);
	std::string strArg1 = *str1;
	std::cout << "getKGTCamValue() - the asked item: " << strArg1 << "\r\n";

    IGraphBuilder* pGraphBuilder;
    ICaptureGraphBuilder2* pCaptureGraphBuilder2;
    //IMediaControl* pMediaControl;
    IBaseFilter* pDeviceFilter = NULL;

    // to select a video input device
    ICreateDevEnum* pCreateDevEnum = NULL;
    IEnumMoniker* pEnumMoniker = NULL;
    IMoniker* pMoniker = NULL;
    ULONG nFetched = 0;

    // initialize COM
    //CoInitialize(nullptr);

    //------------------------- selecting a device--------------------------//
    // Create CreateDevEnum to list device
    CoCreateInstance(CLSID_SystemDeviceEnum, NULL, CLSCTX_INPROC_SERVER,
        IID_ICreateDevEnum, (PVOID*)&pCreateDevEnum);

    // Create EnumMoniker to list VideoInputDevice 
    pCreateDevEnum->CreateClassEnumerator(CLSID_VideoInputDeviceCategory, &pEnumMoniker, 0);
    if (pEnumMoniker == NULL) {
        // this will be shown if there is no capture device
        std::cout << "no device \r\n";
        return; // vv20211021 TBD: here we should collect wrong information then return
    }

    // reset EnumMoniker
    pEnumMoniker->Reset();

    // get each Moniker
    while (pEnumMoniker->Next(1, &pMoniker, &nFetched) == S_OK) {
        IPropertyBag* pPropertyBag;
        LPSTR devname1 = NULL;

        // bind to IPropertyBag
        pMoniker->BindToStorage(0, 0, IID_IPropertyBag, (void**)&pPropertyBag);

        VARIANT varDevPath;
        VARIANT varName;
		VariantInit(&varDevPath);
        VariantInit(&varName);

        // get FriendlyName
        pPropertyBag->Read(L"FriendlyName", &varName, 0);
        std::string strFName = ConvertBSTRToMBS(varName.bstrVal);
		std::cout << strFName << "\r\n"; // show friendly name

		if(SUCCEEDED(pPropertyBag->Read(L"DevicePath", &varName, 0))) // read dev-path
		{
			// The device path is not intended for display.
			//std::cout << "uvcCamCtrl - getKGTCamValue() -  Device path: " << varName.bstrVal << "\r\n";
            strFName = ConvertBSTRToMBS(varName.bstrVal);
		    //std::cout << "uvcCamCtrl - getKGTCamValue() - strFName from Device path: " << strFName << "\r\n";
		}
		else
            std::cout << "uvcCamCtrl - getKGTCamValue(): Error occured!!\r\n";
		
		// Get device by vid and pid
		//if(strFName.find(strVid) != std::string::npos &&
		//	strFName.find(strPid) != std::string::npos)
        if(strFName.compare(strArg0) == 0)
		{
			//std::cout << "---------------------DShow got Kensington webcam. Now start reading value-----------------------\r\n";
			// Bind Monkier to Filter
			pMoniker->BindToObject(0, 0, IID_IBaseFilter, (void**)&pDeviceFilter);
		}

        // release
        pMoniker->Release();
        pPropertyBag->Release();

        if (pDeviceFilter != NULL) {
            break;
        }
    }

    if (pDeviceFilter != NULL) {
        // create FilterGraph
        CoCreateInstance(CLSID_FilterGraph,
            NULL,
            CLSCTX_INPROC,
            IID_IGraphBuilder,
            (LPVOID*)&pGraphBuilder);

        // create CaptureGraphBuilder2
        CoCreateInstance(CLSID_CaptureGraphBuilder2, NULL, CLSCTX_INPROC,
            IID_ICaptureGraphBuilder2,
            (LPVOID*)&pCaptureGraphBuilder2);

        //HRESULT hr = CoInitialize(0);
        IAMStreamConfig* pConfig = NULL;
        HRESULT hr = pCaptureGraphBuilder2->FindInterface(&PIN_CATEGORY_CAPTURE, 0, pDeviceFilter, IID_IAMStreamConfig, (void**)&pConfig);

        #if 0
        int iCount = 0, iSize = 0;
        hr = pConfig->GetNumberOfCapabilities(&iCount, &iSize);

        // Check the size to make sure we pass in the correct structure.
        if (iSize == sizeof(VIDEO_STREAM_CONFIG_CAPS))
        {
            // Use the video capabilities structure.
            for (int iFormat = 0; iFormat < iCount; iFormat++)
            {
                VIDEO_STREAM_CONFIG_CAPS scc;
                AM_MEDIA_TYPE* pmtConfig;
                hr = pConfig->GetStreamCaps(iFormat, &pmtConfig, (BYTE*)&scc);
                if (SUCCEEDED(hr))
                {
                    /* Examine the format, and possibly use it. */
                    if ((pmtConfig->majortype == MEDIATYPE_Video) &&
                        (pmtConfig->subtype == MEDIASUBTYPE_RGB24) &&
                        (pmtConfig->formattype == FORMAT_VideoInfo) &&
                        (pmtConfig->cbFormat >= sizeof(VIDEOINFOHEADER)) &&
                        (pmtConfig->pbFormat != NULL))
                    {
                        VIDEOINFOHEADER* pVih = (VIDEOINFOHEADER*)pmtConfig->pbFormat;
                        // pVih contains the detailed format information.
                        LONG lWidth = pVih->bmiHeader.biWidth;
                        LONG lHeight = pVih->bmiHeader.biHeight;
                    }
                    if (iFormat == 26) { //2 = '1280x720YUV' YUV, 22 = '1280x800YUV', 26 = '1280x720RGB'
                        hr = pConfig->SetFormat(pmtConfig);
                    }
                    // Delete the media type when you are done.
                    _DeleteMediaType(pmtConfig);
                }
            }
        }
        #endif

        long Flags = 0, Val = 0;
        int iSel = 0;
        // Control category
        if (strArg1 == "CameraControl_Pan"          ||
            strArg1 == "CameraControl_Tilt"         ||
            strArg1 == "CameraControl_Roll"         ||
            strArg1 == "CameraControl_Zoom"         ||
            strArg1 == "CameraControl_Exposure"     ||
            strArg1 == "CameraControl_Iris"         ||
            strArg1 == "CameraControl_Focus"        ||
            strArg1 == "CameraControl_LowLightCompensation"
        )
        {
            // Query the capture filter for the IAMCameraControl interface.
            IAMCameraControl* pCameraControl = 0;
            hr = pDeviceFilter->QueryInterface(IID_IAMCameraControl, (void**)&pCameraControl);
            if (FAILED(hr))
            {
                // The device does not support IAMCameraControl
                std::cout << "The device does not support IAMCameraControl" << "\r\n";
            }
            else
            {
                if(strArg1 == "CameraControl_Pan")              iSel = 0;
                else if(strArg1 == "CameraControl_Tilt")        iSel = 1;
                else if(strArg1 == "CameraControl_Roll")        iSel = 2;
                else if(strArg1 == "CameraControl_Zoom")        iSel = 3;
                else if(strArg1 == "CameraControl_Exposure")    iSel = 4;
                else if(strArg1 == "CameraControl_Iris")        iSel = 5;
                else if(strArg1 == "CameraControl_Focus")       iSel = 6;
                else if(strArg1 == "CameraControl_LowLightCompensation") iSel = 19; //related to auto exposure 

                hr = pCameraControl->Get(iSel, &Val, &Flags);
                if (SUCCEEDED(hr))
                {
                    std::cout << "The requested value of" << strArg1 <<" is: " << Val << " auto value: " << Flags << "\r\n";
                }
                else
                {
                    if(strArg1 == "CameraControl_LowLightCompensation")
                        std::cout << "uvcCamCtrl - getKGTCamValue(): Low light is not supported! \r\n";
                    else
                        std::cout << "Not supported: " << iSel <<"\r\n";
                }
            }
            pCameraControl->Release();
        } // Video Pro Amp category
        else if (strArg1 == "VideoProcAmp_Brightness"          ||
            strArg1 == "VideoProcAmp_Contrast"                 ||
            strArg1 == "VideoProcAmp_Hue"                      ||
            strArg1 == "VideoProcAmp_Saturation"               ||
            strArg1 == "VideoProcAmp_Sharpness"                ||
            strArg1 == "VideoProcAmp_Gamma"                    ||
            strArg1 == "VideoProcAmp_ColorEnable"              ||
            strArg1 == "VideoProcAmp_WhiteBalance"             ||
            strArg1 == "VideoProcAmp_BacklightCompensation"    || 
            strArg1 == "VideoProcAmp_Gain"
        )
        {
            // The order and the number can't be changed (should be defined by macro)
            if(strArg1 == "VideoProcAmp_Brightness")                       iSel = 0;
            else if(strArg1 == "VideoProcAmp_Contrast")                    iSel = 1;
            else if(strArg1 == "VideoProcAmp_Hue")                         iSel = 2;
            else if(strArg1 == "VideoProcAmp_Saturation")                  iSel = 3;
            else if(strArg1 == "VideoProcAmp_Sharpness")                   iSel = 4;
            else if(strArg1 == "VideoProcAmp_Gamma")                       iSel = 5;
            else if(strArg1 == "VideoProcAmp_ColorEnable")                 iSel = 6;
            else if(strArg1 == "VideoProcAmp_WhiteBalance")                iSel = 7;
            else if(strArg1 == "VideoProcAmp_BacklightCompensation")       iSel = 8;
            else if(strArg1 == "VideoProcAmp_Gain")                        iSel = 9;

            // Query the capture filter for the IAMVideoProcAmp interface.
            IAMVideoProcAmp* pProcAmp = 0;
            hr = pDeviceFilter->QueryInterface(IID_IAMVideoProcAmp, (void**)&pProcAmp);
            if (FAILED(hr)) {
                std::cout << "The device does not support IAMVideoProcAmp" << "\r\n";
            }
            else
            {
                // vv20210929 here we can get camera parameter (Video Prom Amp)
                hr = pProcAmp->Get(iSel, &Val, &Flags);
                
                if (SUCCEEDED(hr))
                {
                    std::cout << "The requested value of " << strArg1 << " is:" << Val << " ,auto value:" << Flags << "\r\n";
                }
                else {
                    std::cout << "The device does not support this item: " << strArg1 << "\r\n";
                    // TBD: return a false message
                }
            }
            pProcAmp->Release();
        } //ProAmp

        // Create a new empty array.
        Local<v8::Array> arr = Nan::New<v8::Array>(2);
        Nan::Set(arr, 0, Nan::New(Val));
        Nan::Set(arr, 1, Nan::New(Flags));
        info.GetReturnValue().Set(arr);
#if 0
        // set FilterGraph
        pCaptureGraphBuilder2->SetFiltergraph(pGraphBuilder);

        // get MediaControl interface
        pGraphBuilder->QueryInterface(IID_IMediaControl,
            (LPVOID*)&pMediaControl);

        // add device filter to FilterGraph
        pGraphBuilder->AddFilter(pDeviceFilter, L"Device Filter");

        // create Graph
        pCaptureGraphBuilder2->RenderStream(&PIN_CATEGORY_CAPTURE,
            NULL, pDeviceFilter, NULL, NULL);
#endif
        // release
        //pMediaControl->Release();
        pCaptureGraphBuilder2->Release();
        pGraphBuilder->Release();
    }

    // release
    pEnumMoniker->Release();
    pCreateDevEnum->Release();

    // finalize COM
    //CoUninitialize();
}

void setKGTCamValue(const Nan::FunctionCallbackInfo<v8::Value>& info)
{
	std::cout << "UVCCamCtrl - setKGTCamValue()";
	
	v8::Isolate* isolate = info.GetIsolate();
	v8::String::Utf8Value str(isolate, info[0]);
	std::string strArg0 = *str;
    strArg0 = reSortDevPath(strArg0);
	//std::cout << "setKGTCamValue() - the input param value: " << strArg0 << "\r\n";

    v8::String::Utf8Value str1(isolate, info[1]);
	std::string strArg1 = *str1;
	//std::cout << "setKGTCamValue() - the asked item: " << strArg1 << "\r\n";

    double arg_ValSet = info[2]->NumberValue(Nan::GetCurrentContext()).FromJust();
	//std::cout << "setKGTCamValue() - the third input val: " << arg_ValSet << "\r\n";

    double arg_AutoManual = info[3]->NumberValue(Nan::GetCurrentContext()).FromJust();
	//std::cout << "setKGTCamValue() - the fourth input val: " << arg_AutoManual << "\r\n";

    int retVal = 0;

	// 這裡開始裂解PID和VID
	//std::string strKey("vid_");
	//size_t pos = strArg0.find(strKey);
	//std::string strVid = strArg0.substr(pos, 8);
	//std::cout << "uvcCamCtrl - getKGTCamValue() - strVid: " << strVid << "\r\n";

	//strKey = "pid_";
	//pos = strArg0.find(strKey);
	//std::string strPid = strArg0.substr(pos, 8);
	//std::cout << "uvcCamCtrl - getKGTCamValue() - strPid: " << strPid << "\r\n";

    IGraphBuilder* pGraphBuilder;
    ICaptureGraphBuilder2* pCaptureGraphBuilder2;
    //IMediaControl* pMediaControl;
    IBaseFilter* pDeviceFilter = NULL;

    // to select a video input device
    ICreateDevEnum* pCreateDevEnum = NULL;
    IEnumMoniker* pEnumMoniker = NULL;
    IMoniker* pMoniker = NULL;
    ULONG nFetched = 0;

    // initialize COM
    //CoInitialize(nullptr);

    //------------------------- selecting a device--------------------------//
    // Create CreateDevEnum to list device
    CoCreateInstance(CLSID_SystemDeviceEnum, NULL, CLSCTX_INPROC_SERVER, IID_ICreateDevEnum, (PVOID*)&pCreateDevEnum);

    // Create EnumMoniker to list VideoInputDevice 
    pCreateDevEnum->CreateClassEnumerator(CLSID_VideoInputDeviceCategory, &pEnumMoniker, 0);
    if (pEnumMoniker == NULL) {
        // this will be shown if there is no capture device
        std::cout << "no device \r\n";
        retVal = -1;
        //return; // vv20211021 TBD: here we should collect wrong information then return
    }

    // reset EnumMoniker
    pEnumMoniker->Reset();

    // get each Moniker
    while (pEnumMoniker->Next(1, &pMoniker, &nFetched) == S_OK) {
        IPropertyBag* pPropertyBag;
        LPSTR devname1 = NULL;

        // bind to IPropertyBag
        pMoniker->BindToStorage(0, 0, IID_IPropertyBag, (void**)&pPropertyBag);

        VARIANT varDevPath;
        VARIANT varName;
		VariantInit(&varDevPath);
        VariantInit(&varName);

        // get FriendlyName
        pPropertyBag->Read(L"FriendlyName", &varName, 0);
        std::string strFName = ConvertBSTRToMBS(varName.bstrVal);
		std::cout << strFName << "\r\n"; // show friendly name

		if(SUCCEEDED(pPropertyBag->Read(L"DevicePath", &varName, 0))) // read dev-path
		{
			// The device path is not intended for display.
			//std::cout << "uvcCamCtrl - setKGTCamValue() -  Device path: " << varName.bstrVal << "\r\n";
            strFName = ConvertBSTRToMBS(varName.bstrVal);
		    std::cout << "uvcCamCtrl - setKGTCamValue() - strFName from Device path: " << strFName << "\r\n";
		}

        if(strFName.compare(strArg0) == 0) 
		{
			//std::cout << "----------------Got Kensington webcam. Now start control it!----------------------\r\n";
			// Bind Monkier to Filter
			pMoniker->BindToObject(0, 0, IID_IBaseFilter, (void**)&pDeviceFilter);
		}

        // release
        pMoniker->Release();
        pPropertyBag->Release();

        if (pDeviceFilter != NULL) {
            break;
        }
    }

    if (pDeviceFilter != NULL)
    {
        // create FilterGraph
        CoCreateInstance(CLSID_FilterGraph,
            NULL,
            CLSCTX_INPROC,
            IID_IGraphBuilder,
            (LPVOID*)&pGraphBuilder);

        // create CaptureGraphBuilder2
        CoCreateInstance(CLSID_CaptureGraphBuilder2, NULL, CLSCTX_INPROC,
            IID_ICaptureGraphBuilder2,
            (LPVOID*)&pCaptureGraphBuilder2);

        //HRESULT hr = CoInitialize(0);
        IAMStreamConfig* pConfig = NULL;
        HRESULT hr = pCaptureGraphBuilder2->FindInterface(&PIN_CATEGORY_CAPTURE, 0, pDeviceFilter, IID_IAMStreamConfig, (void**)&pConfig);

        #if 0
        int iCount = 0, iSize = 0;
        hr = pConfig->GetNumberOfCapabilities(&iCount, &iSize);

        // Check the size to make sure we pass in the correct structure.
        if (iSize == sizeof(VIDEO_STREAM_CONFIG_CAPS))
        {
            // Use the video capabilities structure.
            for (int iFormat = 0; iFormat < iCount; iFormat++)
            {
                VIDEO_STREAM_CONFIG_CAPS scc;
                AM_MEDIA_TYPE* pmtConfig;
                hr = pConfig->GetStreamCaps(iFormat, &pmtConfig, (BYTE*)&scc);
                if (SUCCEEDED(hr))
                {
                    /* Examine the format, and possibly use it. */
                    if ((pmtConfig->majortype == MEDIATYPE_Video) &&
                        (pmtConfig->subtype == MEDIASUBTYPE_RGB24) &&
                        (pmtConfig->formattype == FORMAT_VideoInfo) &&
                        (pmtConfig->cbFormat >= sizeof(VIDEOINFOHEADER)) &&
                        (pmtConfig->pbFormat != NULL))
                    {
                        VIDEOINFOHEADER* pVih = (VIDEOINFOHEADER*)pmtConfig->pbFormat;
                        // pVih contains the detailed format information.
                        LONG lWidth = pVih->bmiHeader.biWidth;
                        LONG lHeight = pVih->bmiHeader.biHeight;
                    }
                    if (iFormat == 26) { //2 = '1280x720YUV' YUV, 22 = '1280x800YUV', 26 = '1280x720RGB'
                        hr = pConfig->SetFormat(pmtConfig);
                    }
                    // Delete the media type when you are done.
                    _DeleteMediaType(pmtConfig);
                }
            }
        }
        #endif
        //long Flags, Val;
        int iSel = 0;
        // Control category
        if (strArg1 == "CameraControl_Pan"          ||
            strArg1 == "CameraControl_Tilt"         ||
            strArg1 == "CameraControl_Roll"         ||
            strArg1 == "CameraControl_Zoom"         ||
            strArg1 == "CameraControl_Exposure"     ||
            strArg1 == "CameraControl_Iris"         ||
            strArg1 == "CameraControl_Focus"        ||
            strArg1 == "CameraControl_LowLightCompensation"
        )
        {
            // Query the capture filter for the IAMCameraControl interface.
            IAMCameraControl* pCameraControl = 0;
            hr = pDeviceFilter->QueryInterface(IID_IAMCameraControl, (void**)&pCameraControl);
            if (FAILED(hr))
            {
                // The device does not support IAMCameraControl
                std::cout << "The device does not support IAMCameraControl" << "\r\n";
            }
            else
            {
                if(strArg1 == "CameraControl_Pan")              iSel = 0;
                else if(strArg1 == "CameraControl_Tilt")        iSel = 1;
                else if(strArg1 == "CameraControl_Roll")        iSel = 2;
                else if(strArg1 == "CameraControl_Zoom")        iSel = 3;
                else if(strArg1 == "CameraControl_Exposure")    iSel = 4;
                else if(strArg1 == "CameraControl_Iris")        iSel = 5;
                else if(strArg1 == "CameraControl_Focus")       iSel = 6;
                else if(strArg1 == "CameraControl_LowLightCompensation") iSel = 19; //related to auto exposure 

                hr = pCameraControl->Set(iSel, arg_ValSet, arg_AutoManual);                
                if (SUCCEEDED(hr))
                {
                    std::cout << "Set control value to camera successfully! \r\n";
                }
            }
            pCameraControl->Release();
        } // Video Pro Amp category
        else if (strArg1 == "VideoProcAmp_Brightness"          ||
            strArg1 == "VideoProcAmp_Contrast"                 ||
            strArg1 == "VideoProcAmp_Hue"                      ||
            strArg1 == "VideoProcAmp_Saturation"               ||
            strArg1 == "VideoProcAmp_Sharpness"                ||
            strArg1 == "VideoProcAmp_Gamma"                    ||
            strArg1 == "VideoProcAmp_ColorEnable"              ||
            strArg1 == "VideoProcAmp_WhiteBalance"             ||
            strArg1 == "VideoProcAmp_BacklightCompensation"    || 
            strArg1 == "VideoProcAmp_Gain"
        )
        {
            // The order and the number can't be changed (should be defined by macro)
            if(strArg1 == "VideoProcAmp_Brightness")                       iSel = 0;
            else if(strArg1 == "VideoProcAmp_Contrast")                    iSel = 1;
            else if(strArg1 == "VideoProcAmp_Hue")                         iSel = 2;
            else if(strArg1 == "VideoProcAmp_Saturation")                  iSel = 3;
            else if(strArg1 == "VideoProcAmp_Sharpness")                   iSel = 4;
            else if(strArg1 == "VideoProcAmp_Gamma")                       iSel = 5;
            else if(strArg1 == "VideoProcAmp_ColorEnable")                 iSel = 6;
            else if(strArg1 == "VideoProcAmp_WhiteBalance")                iSel = 7;
            else if(strArg1 == "VideoProcAmp_BacklightCompensation")       iSel = 8;
            else if(strArg1 == "VideoProcAmp_Gain")                        iSel = 9;

            // Query the capture filter for the IAMVideoProcAmp interface.
            IAMVideoProcAmp* pProcAmp = 0;
            hr = pDeviceFilter->QueryInterface(IID_IAMVideoProcAmp, (void**)&pProcAmp);
            if (FAILED(hr)) {
                std::cout << "The device does not support IAMVideoProcAmp" << "\r\n";
            }
            else
            {
                hr = pProcAmp->Set(iSel, arg_ValSet, arg_AutoManual);
                if (SUCCEEDED(hr))
                {
                    std::cout << "Set Pro Amp value to camera successfully! \r\n";
                }
                else
                {
                    std::cout << "Set Pro Amp value to camera failed. \r\n";
                    retVal = -1;
                }
            }
            pProcAmp->Release();
        } //ProAmp
#if 0
        // set FilterGraph
        pCaptureGraphBuilder2->SetFiltergraph(pGraphBuilder);

        // get MediaControl interface
        pGraphBuilder->QueryInterface(IID_IMediaControl,
            (LPVOID*)&pMediaControl);

        // add device filter to FilterGraph
        pGraphBuilder->AddFilter(pDeviceFilter, L"Device Filter");

        // create Graph
        pCaptureGraphBuilder2->RenderStream(&PIN_CATEGORY_CAPTURE,
            NULL, pDeviceFilter, NULL, NULL);
#endif
        // release
        //pMediaControl->Release();
        pCaptureGraphBuilder2->Release();
        pGraphBuilder->Release();
    }
    else
    {
        retVal = -1;
    }

    info.GetReturnValue().Set(retVal);
    // release
    pEnumMoniker->Release();
    pCreateDevEnum->Release();

    // finalize COM
    //CoUninitialize();
}

void getSerialNum(const Nan::FunctionCallbackInfo<v8::Value>& info)
{
    std::cout << "UVCCamCtrl - getSerialNum()\r\n";

	v8::Isolate* isolate = info.GetIsolate();
	v8::String::Utf8Value str(isolate, info[0]);
	std::string strArg0 = *str;
	//std::cout << "getSerialNum() - the input param value: " << strArg0 << "\r\n";

    // Cut unneccessary part
    strArg0 = reSortDevPath(strArg0);
    //std::cout << "getSerialNum() - After cut unneccessary part: " << strArg0 << "\r\n";

	// 這裡開始裂解PID和VID
	std::string strKey("vid_");
	size_t pos = strArg0.find(strKey);
	std::string strVid = strArg0.substr(pos, 8);
	//std::cout << "uvcCamCtrl - getSerialNum() - strVid: " << strVid << "\r\n";

	strKey = "pid_";
	pos = strArg0.find(strKey);
	std::string strPid = strArg0.substr(pos, 8);
	//std::cout << "uvcCamCtrl - getSerialNum() - strPid: " << strPid << "\r\n";

    std::string tempStr = strArg0;
    std::string tempStr1 = getSNByPIDVID(strArg0, strPid, strVid);

    v8::Local<String> result;
    v8::MaybeLocal<v8::String> temp = String::NewFromUtf8(isolate, tempStr1.c_str());
    temp.ToLocal(&result);

    info.GetReturnValue().Set(result);

}

void getKGTCamAllValue(const Nan::FunctionCallbackInfo<v8::Value>& info)
{
    std::cout << "UVCCamCtrl - getKGTCamAllValue()";

	v8::Isolate* isolate = info.GetIsolate();
	v8::String::Utf8Value str(isolate, info[0]);
	std::string strArg0 = *str;
    strArg0 = reSortDevPath(strArg0);

    IGraphBuilder* pGraphBuilder;
    ICaptureGraphBuilder2* pCaptureGraphBuilder2;
    //IMediaControl* pMediaControl;
    IBaseFilter* pDeviceFilter = NULL;

    // to select a video input device
    ICreateDevEnum* pCreateDevEnum = NULL;
    IEnumMoniker* pEnumMoniker = NULL;
    IMoniker* pMoniker = NULL;
    ULONG nFetched = 0;

    // Create a new empty array.
    Local<v8::Array> arr = Nan::New<v8::Array>(36);
    long Flags = 0, Val = 0;
    int iSel = 0;

    // initialize COM
    //CoInitialize(nullptr);

    //------------------------- selecting a device--------------------------//
    // Create CreateDevEnum to list device
    CoCreateInstance(CLSID_SystemDeviceEnum, NULL, CLSCTX_INPROC_SERVER,
        IID_ICreateDevEnum, (PVOID*)&pCreateDevEnum);

    // Create EnumMoniker to list VideoInputDevice 
    pCreateDevEnum->CreateClassEnumerator(CLSID_VideoInputDeviceCategory, &pEnumMoniker, 0);
    if (pEnumMoniker == NULL) {
        // this will be shown if there is no capture device
        std::cout << "UVCCamCtrl - getKGTCamAllValue() - no device \r\n";
        return; // vv20211021 TBD: here we should collect wrong information then return
    }

    // reset EnumMoniker
    pEnumMoniker->Reset();

    // get each Moniker
    while (pEnumMoniker->Next(1, &pMoniker, &nFetched) == S_OK) {
        IPropertyBag* pPropertyBag;
        LPSTR devname1 = NULL;

        // bind to IPropertyBag
        pMoniker->BindToStorage(0, 0, IID_IPropertyBag, (void**)&pPropertyBag);

        VARIANT varDevPath;
        VARIANT varName;
        VariantInit(&varDevPath);
        VariantInit(&varName);

        // get FriendlyName
        pPropertyBag->Read(L"FriendlyName", &varName, 0);
        std::string strFName = ConvertBSTRToMBS(varName.bstrVal);
        std::cout << strFName << "\r\n"; // show friendly name

        if(SUCCEEDED(pPropertyBag->Read(L"DevicePath", &varName, 0))) // read dev-path
        {
            // The device path is not intended for display.
            //std::cout << "uvcCamCtrl - getKGTCamValue() -  Device path: " << varName.bstrVal << "\r\n";
            strFName = ConvertBSTRToMBS(varName.bstrVal);
            std::cout << "UVCCamCtrl - getKGTCamAllValue() - strFName from Device path: " << strFName << "\r\n";
        }
        else
        {
            std::cout << "UVCCamCtrl - getKGTCamAllValue(): Error occured!!\r\n";
            // TBD: collect error information and return
        }

        if(strFName.compare(strArg0) == 0)
        {
            //std::cout << "---------------------DShow got Kensington webcam. Now start reading value-----------------------\r\n";
            // Bind Monkier to Filter
            pMoniker->BindToObject(0, 0, IID_IBaseFilter, (void**)&pDeviceFilter);
        }

        // release
        pMoniker->Release();
        pPropertyBag->Release();

        if (pDeviceFilter != NULL) {
            break;
        }
    }
    if (pDeviceFilter != NULL) {
        // create FilterGraph
        CoCreateInstance(CLSID_FilterGraph,
            NULL,
            CLSCTX_INPROC,
            IID_IGraphBuilder,
            (LPVOID*)&pGraphBuilder);

        // create CaptureGraphBuilder2
        CoCreateInstance(CLSID_CaptureGraphBuilder2, NULL, CLSCTX_INPROC,
            IID_ICaptureGraphBuilder2,
            (LPVOID*)&pCaptureGraphBuilder2);

        //HRESULT hr = CoInitialize(0);
        IAMStreamConfig* pConfig = NULL;
        HRESULT hr = pCaptureGraphBuilder2->FindInterface(&PIN_CATEGORY_CAPTURE, 0, pDeviceFilter, IID_IAMStreamConfig, (void**)&pConfig);
        #if 0
        int iCount = 0, iSize = 0;
        hr = pConfig->GetNumberOfCapabilities(&iCount, &iSize);

        // Check the size to make sure we pass in the correct structure.
        if (iSize == sizeof(VIDEO_STREAM_CONFIG_CAPS))
        {
            // Use the video capabilities structure.
            for (int iFormat = 0; iFormat < iCount; iFormat++)
            {
                VIDEO_STREAM_CONFIG_CAPS scc;
                AM_MEDIA_TYPE* pmtConfig;
                hr = pConfig->GetStreamCaps(iFormat, &pmtConfig, (BYTE*)&scc);
                if (SUCCEEDED(hr))
                {
                    /* Examine the format, and possibly use it. */
                    if ((pmtConfig->majortype == MEDIATYPE_Video) &&
                        (pmtConfig->subtype == MEDIASUBTYPE_RGB24) &&
                        (pmtConfig->formattype == FORMAT_VideoInfo) &&
                        (pmtConfig->cbFormat >= sizeof(VIDEOINFOHEADER)) &&
                        (pmtConfig->pbFormat != NULL))
                    {
                        VIDEOINFOHEADER* pVih = (VIDEOINFOHEADER*)pmtConfig->pbFormat;
                        // pVih contains the detailed format information.
                        LONG lWidth = pVih->bmiHeader.biWidth;
                        LONG lHeight = pVih->bmiHeader.biHeight;
                    }
                    if (iFormat == 26) { //2 = '1280x720YUV' YUV, 22 = '1280x800YUV', 26 = '1280x720RGB'
                        hr = pConfig->SetFormat(pmtConfig);
                    }
                    // Delete the media type when you are done.
                    _DeleteMediaType(pmtConfig);
                }
            }
        }
        #endif

        // 1. Get all Video Pro Amp category
        // Query the capture filter for the IAMVideoProcAmp interface.
        IAMVideoProcAmp* pProcAmp = 0;
        hr = pDeviceFilter->QueryInterface(IID_IAMVideoProcAmp, (void**)&pProcAmp);
        if (FAILED(hr)) {
            std::cout << "The device does not support IAMVideoProcAmp" << "\r\n";
            // TBD: 
        }
        else
        {
            // vv20210929 here we can get camera parameter (Video Prom Amp)
            // the-flag value - 1:auto, 2:manual, 0:unsupported (好昏！) 
            iSel = 0;
            for(int i = 0; i < 10*2; i+=2)
            {
                hr = pProcAmp->Get(iSel, &Val, &Flags);
                if(SUCCEEDED(hr))
                {
                    Nan::Set(arr, i, Nan::New(Val));
                    Nan::Set(arr, i+1, Nan::New(Flags));
                }
                else
                {
                    Nan::Set(arr, i, Nan::New(0));
                    Nan::Set(arr, i+1, Nan::New(0));
                }
                iSel++;
            }
            //int i = 0;
            //iSel = 0; hr = pProcAmp->Get(iSel, &Val, &Flags); // VideoProcAmp_Brightness
            //iSel = 1; hr = pProcAmp->Get(iSel, &Val, &Flags); // VideoProcAmp_Contrast
            //iSel = 2; hr = pProcAmp->Get(iSel, &Val, &Flags); // VideoProcAmp_Hue
            //iSel = 3; hr = pProcAmp->Get(iSel, &Val, &Flags); // VideoProcAmp_Saturation
            //iSel = 4; hr = pProcAmp->Get(iSel, &Val, &Flags); // VideoProcAmp_Sharpness
            //iSel = 5; hr = pProcAmp->Get(iSel, &Val, &Flags); // VideoProcAmp_Gamma
            //iSel = 6; hr = pProcAmp->Get(iSel, &Val, &Flags); // VideoProcAmp_ColorEnable (Unsupported)
            //iSel = 7; hr = pProcAmp->Get(iSel, &Val, &Flags); // VideoProcAmp_WhiteBalance
            //iSel = 8; hr = pProcAmp->Get(iSel, &Val, &Flags); // VideoProcAmp_BacklightCompensation
            //iSel = 9; hr = pProcAmp->Get(iSel, &Val, &Flags); // VideoProcAmp_Gain
        }
        pProcAmp->Release();

        // 2. Get all Control category
        // Query the capture filter for the IAMCameraControl interface.
        IAMCameraControl* pCameraControl = 0;
        hr = pDeviceFilter->QueryInterface(IID_IAMCameraControl, (void**)&pCameraControl);
        if (FAILED(hr))
        {
            // The device does not support IAMCameraControl
            std::cout << "The device does not support IAMCameraControl" << "\r\n";
        }
        else
        {
            iSel = 0;
            for(int i = 20; i < 20+7*2; i+=2)
            {
                Val = 0; Flags = 0;
                hr = pCameraControl->Get(iSel, &Val, &Flags);
                if(SUCCEEDED(hr))
                {
                    Nan::Set(arr, i, Nan::New(Val));
                    Nan::Set(arr, i+1, Nan::New(Flags));
                }
                else
                {
                    Nan::Set(arr, i, Nan::New(0));
                    Nan::Set(arr, i+1, Nan::New(0));
                }
                iSel++;
            }
            iSel = 19; Val = 0; Flags = 0;
            hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_LowLightCompensation
            if(SUCCEEDED(hr))
            {
                Nan::Set(arr, 34, Nan::New(Val));
                Nan::Set(arr, 35, Nan::New(Flags));
            }
            
            //iSel = 0; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Pan
            //iSel = 1; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Tilt
            //iSel = 2; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Roll
            //iSel = 3; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Zoom
            //iSel = 4; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Exposure
            //iSel = 5; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Iris
            //iSel = 6; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Focus
            //iSel = 19; hr = pCameraControl->Get(iSel, &Val, &Flags); // CameraControl_LowLightCompensation
        }
        pCameraControl->Release();
        // Set the return array 
        info.GetReturnValue().Set(arr);
#if 0
        // set FilterGraph
        pCaptureGraphBuilder2->SetFiltergraph(pGraphBuilder);

        // get MediaControl interface
        pGraphBuilder->QueryInterface(IID_IMediaControl,
            (LPVOID*)&pMediaControl);

        // add device filter to FilterGraph
        pGraphBuilder->AddFilter(pDeviceFilter, L"Device Filter");

        // create Graph
        pCaptureGraphBuilder2->RenderStream(&PIN_CATEGORY_CAPTURE,
            NULL, pDeviceFilter, NULL, NULL);
#endif
        // release
        //pMediaControl->Release();
        pCaptureGraphBuilder2->Release();
        pGraphBuilder->Release();
    }
    // release
    pEnumMoniker->Release();
    pCreateDevEnum->Release();

    // finalize COM
    //CoUninitialize();
}
void getKGTCamAllRange(const Nan::FunctionCallbackInfo<v8::Value>& info)
{
    std::cout << "UVCCamCtrl - getKGTCamAllRange()";

	v8::Isolate* isolate = info.GetIsolate();
	v8::String::Utf8Value str(isolate, info[0]);
	std::string strArg0 = *str;
    strArg0 = reSortDevPath(strArg0);

    IGraphBuilder* pGraphBuilder;
    ICaptureGraphBuilder2* pCaptureGraphBuilder2;
    //IMediaControl* pMediaControl;
    IBaseFilter* pDeviceFilter = NULL;

    // to select a video input device
    ICreateDevEnum* pCreateDevEnum = NULL;
    IEnumMoniker* pEnumMoniker = NULL;
    IMoniker* pMoniker = NULL;
    ULONG nFetched = 0;

    // Create a new empty array.
    Local<v8::Array> arr = Nan::New<v8::Array>(90); // 18 items, each item has 5 sub items
    long Min = 0, Max = 0, Step = 0, Default = 0, Flags = 0;
    int iSel = 0;

    // initialize COM
    //CoInitialize(nullptr);

    //------------------------- selecting a device--------------------------//
    // Create CreateDevEnum to list device
    CoCreateInstance(CLSID_SystemDeviceEnum, NULL, CLSCTX_INPROC_SERVER, IID_ICreateDevEnum, (PVOID*)&pCreateDevEnum);

    // Create EnumMoniker to list VideoInputDevice 
    pCreateDevEnum->CreateClassEnumerator(CLSID_VideoInputDeviceCategory, &pEnumMoniker, 0);
    if (pEnumMoniker == NULL) {
        std::cout << "UVCCamCtrl - getKGTCamAllRange() - no device \r\n";
        return; // vv20211021 TBD: here we should collect wrong information then return
    }

    // reset EnumMoniker
    pEnumMoniker->Reset();

    // get each Moniker
    while (pEnumMoniker->Next(1, &pMoniker, &nFetched) == S_OK) {
        IPropertyBag* pPropertyBag;
        LPSTR devname1 = NULL;

        // bind to IPropertyBag
        pMoniker->BindToStorage(0, 0, IID_IPropertyBag, (void**)&pPropertyBag);

        VARIANT varDevPath;
        VARIANT varName;
        VariantInit(&varDevPath);
        VariantInit(&varName);

        // get FriendlyName
        pPropertyBag->Read(L"FriendlyName", &varName, 0);
        std::string strFName = ConvertBSTRToMBS(varName.bstrVal);
        std::cout << strFName << "\r\n"; // show friendly name

        if(SUCCEEDED(pPropertyBag->Read(L"DevicePath", &varName, 0))) // read dev-path
        {
            // The device path is not intended for display.
            //std::cout << "uvcCamCtrl - getKGTCamValue() -  Device path: " << varName.bstrVal << "\r\n";
            strFName = ConvertBSTRToMBS(varName.bstrVal);
            std::cout << "UVCCamCtrl - getKGTCamAllValue() - strFName from Device path: " << strFName << "\r\n";
        }
        else
        {
            std::cout << "UVCCamCtrl - getKGTCamAllValue(): Error occured!!\r\n";
            // TBD: collect error information and return
        }

        if(strFName.compare(strArg0) == 0)
        {
            // Bind Monkier to Filter
            pMoniker->BindToObject(0, 0, IID_IBaseFilter, (void**)&pDeviceFilter);
        }

        // release
        pMoniker->Release();
        pPropertyBag->Release();

        if (pDeviceFilter != NULL) {
            break;
        }
    }
    if (pDeviceFilter != NULL) {
        // create FilterGraph
        CoCreateInstance(CLSID_FilterGraph,
            NULL,
            CLSCTX_INPROC,
            IID_IGraphBuilder,
            (LPVOID*)&pGraphBuilder);

        // create CaptureGraphBuilder2
        CoCreateInstance(CLSID_CaptureGraphBuilder2, NULL, CLSCTX_INPROC,
            IID_ICaptureGraphBuilder2,
            (LPVOID*)&pCaptureGraphBuilder2);

        //HRESULT hr = CoInitialize(0);
        IAMStreamConfig* pConfig = NULL;
        HRESULT hr = pCaptureGraphBuilder2->FindInterface(&PIN_CATEGORY_CAPTURE, 0, pDeviceFilter, IID_IAMStreamConfig, (void**)&pConfig);
        #if 0
        int iCount = 0, iSize = 0;
        hr = pConfig->GetNumberOfCapabilities(&iCount, &iSize);

        // Check the size to make sure we pass in the correct structure.
        if (iSize == sizeof(VIDEO_STREAM_CONFIG_CAPS))
        {
            // Use the video capabilities structure.
            for (int iFormat = 0; iFormat < iCount; iFormat++)
            {
                VIDEO_STREAM_CONFIG_CAPS scc;
                AM_MEDIA_TYPE* pmtConfig;
                hr = pConfig->GetStreamCaps(iFormat, &pmtConfig, (BYTE*)&scc);
                if (SUCCEEDED(hr))
                {
                    /* Examine the format, and possibly use it. */
                    if ((pmtConfig->majortype == MEDIATYPE_Video) &&
                        (pmtConfig->subtype == MEDIASUBTYPE_RGB24) &&
                        (pmtConfig->formattype == FORMAT_VideoInfo) &&
                        (pmtConfig->cbFormat >= sizeof(VIDEOINFOHEADER)) &&
                        (pmtConfig->pbFormat != NULL))
                    {
                        VIDEOINFOHEADER* pVih = (VIDEOINFOHEADER*)pmtConfig->pbFormat;
                        // pVih contains the detailed format information.
                        LONG lWidth = pVih->bmiHeader.biWidth;
                        LONG lHeight = pVih->bmiHeader.biHeight;
                    }
                    if (iFormat == 26) { //2 = '1280x720YUV' YUV, 22 = '1280x800YUV', 26 = '1280x720RGB'
                        hr = pConfig->SetFormat(pmtConfig);
                    }
                    // Delete the media type when you are done.
                    _DeleteMediaType(pmtConfig);
                }
            }
        }
        #endif

        // 1. Get all Video Pro Amp category
        // Query the capture filter for the IAMVideoProcAmp interface.
        IAMVideoProcAmp* pProcAmp = 0;
        hr = pDeviceFilter->QueryInterface(IID_IAMVideoProcAmp, (void**)&pProcAmp);
        if (FAILED(hr)) {
            std::cout << "The device does not support IAMVideoProcAmp" << "\r\n";
            // TBD: 
        }
        else
        {
            // vv20210929 here we can get camera parameter (Video Prom Amp)
            // Flag - 1:auto, 2:manual, 3:both
            iSel = 0;
            for(int i = 0; i < 10*5; i+=5)
            {
                hr = pProcAmp->GetRange(iSel, &Min, &Max, &Step, &Default, &Flags);
                if(SUCCEEDED(hr))
                {
                    Nan::Set(arr, i, Nan::New(Min));
                    Nan::Set(arr, i+1, Nan::New(Max));
                    Nan::Set(arr, i+2, Nan::New(Step));
                    Nan::Set(arr, i+3, Nan::New(Default));
                    Nan::Set(arr, i+4, Nan::New(Flags));
                }
                else
                {
                    Nan::Set(arr, i, Nan::New(0));
                    Nan::Set(arr, i+1, Nan::New(0));
                    Nan::Set(arr, i+2, Nan::New(0));
                    Nan::Set(arr, i+3, Nan::New(0));
                    Nan::Set(arr, i+4, Nan::New(0));
                }
                iSel++;
            }
            //iSel = 0;  // 0: VideoProcAmp_Brightness
            //iSel = 1;  // 1: VideoProcAmp_Contrast
            //iSel = 2;  // 2: VideoProcAmp_Hue
            //iSel = 3;  // 3: VideoProcAmp_Saturation
            //iSel = 4;  // 4: VideoProcAmp_Sharpness
            //iSel = 5;  // 5: VideoProcAmp_Gamma
            //iSel = 6;  // 6: VideoProcAmp_ColorEnable (Unsupported)
            //iSel = 7;  // 7: VideoProcAmp_WhiteBalance
            //iSel = 8;  // 8: VideoProcAmp_BacklightCompensation
            //iSel = 9;  // 9: VideoProcAmp_Gain
        }
        pProcAmp->Release();

        // 2. Get all Control category
        // Query the capture filter for the IAMCameraControl interface.
        IAMCameraControl* pCameraControl = 0;
        hr = pDeviceFilter->QueryInterface(IID_IAMCameraControl, (void**)&pCameraControl);
        if (FAILED(hr))
        {
            // The device does not support IAMCameraControl
            std::cout << "The device does not support IAMCameraControl" << "\r\n";
        }
        else
        {
            iSel = 0;
            for(int i = 50; i < 50+7*5; i += 5)
            {
                hr = pCameraControl->GetRange(iSel, &Min, &Max, &Step, &Default, &Flags);
                if(SUCCEEDED(hr))
                {
                    Nan::Set(arr, i, Nan::New(Min));
                    Nan::Set(arr, i+1, Nan::New(Max));
                    Nan::Set(arr, i+2, Nan::New(Step));
                    Nan::Set(arr, i+3, Nan::New(Default));
                    Nan::Set(arr, i+4, Nan::New(Flags));
                }
                else
                {
                    Nan::Set(arr, i, Nan::New(0));
                    Nan::Set(arr, i+1, Nan::New(0));
                    Nan::Set(arr, i+2, Nan::New(0));
                    Nan::Set(arr, i+3, Nan::New(0));
                    Nan::Set(arr, i+4, Nan::New(0));
                }
                iSel++;
            }
            iSel = 19;
            hr = pCameraControl->GetRange(iSel, &Min, &Max, &Step, &Default, &Flags);
            if(SUCCEEDED(hr))
            {
                Nan::Set(arr, 85, Nan::New(Min));
                Nan::Set(arr, 86, Nan::New(Max));
                Nan::Set(arr, 87, Nan::New(Step));
                Nan::Set(arr, 88, Nan::New(Default));
                Nan::Set(arr, 89, Nan::New(Flags));
            }
            
            //iSel = 0; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Pan
            //iSel = 1; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Tilt
            //iSel = 2; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Roll
            //iSel = 3; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Zoom
            //iSel = 4; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Exposure
            //iSel = 5; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Iris
            //iSel = 6; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Focus
            //iSel = 19; hr = pCameraControl->Get(iSel, &Val, &Flags); // CameraControl_LowLightCompensation
        }
        pCameraControl->Release();
        // Set the return array 
        info.GetReturnValue().Set(arr);
#if 0
        // set FilterGraph
        pCaptureGraphBuilder2->SetFiltergraph(pGraphBuilder);

        // get MediaControl interface
        pGraphBuilder->QueryInterface(IID_IMediaControl,
            (LPVOID*)&pMediaControl);

        // add device filter to FilterGraph
        pGraphBuilder->AddFilter(pDeviceFilter, L"Device Filter");

        // create Graph
        pCaptureGraphBuilder2->RenderStream(&PIN_CATEGORY_CAPTURE,
            NULL, pDeviceFilter, NULL, NULL);
#endif
        // release
        //pMediaControl->Release();
        pCaptureGraphBuilder2->Release();
        pGraphBuilder->Release();
    }
    // Release object
    pEnumMoniker->Release();
    pCreateDevEnum->Release();

    // finalize COM
    //CoUninitialize();
}
void resetKGTCam(const Nan::FunctionCallbackInfo<v8::Value>& info)
{
    std::cout << "UVCCamCtrl - resetKGTCam()";

	v8::Isolate* isolate = info.GetIsolate();
	v8::String::Utf8Value str(isolate, info[0]);
	std::string strArg0 = *str;
    strArg0 = reSortDevPath(strArg0);

    IGraphBuilder* pGraphBuilder;
    ICaptureGraphBuilder2* pCaptureGraphBuilder2;
    //IMediaControl* pMediaControl;
    IBaseFilter* pDeviceFilter = NULL;

    // to select a video input device
    ICreateDevEnum* pCreateDevEnum = NULL;
    IEnumMoniker* pEnumMoniker = NULL;
    IMoniker* pMoniker = NULL;
    ULONG nFetched = 0;

    // Create a new empty array.
    //Local<v8::Array> arr = Nan::New<v8::Array>(90); // 18 items, each item has 5 sub items
    long Min = 0, Max = 0, Step = 0, Default = 0, Flags = 0;
    int iSel = 0;

    // initialize COM
    // CoInitialize(nullptr);

    //------------------------- selecting a device--------------------------//
    // Create CreateDevEnum to list device
    CoCreateInstance(CLSID_SystemDeviceEnum, NULL, CLSCTX_INPROC_SERVER, IID_ICreateDevEnum, (PVOID*)&pCreateDevEnum);

    // Create EnumMoniker to list VideoInputDevice 
    pCreateDevEnum->CreateClassEnumerator(CLSID_VideoInputDeviceCategory, &pEnumMoniker, 0);
    if (pEnumMoniker == NULL) {
        std::cout << "UVCCamCtrl - resetKGTCam() - no device \r\n";
        return; // vv20211021 TBD: here we should collect wrong information then return
    }

    // reset EnumMoniker
    pEnumMoniker->Reset();

    // get each Moniker
    while (pEnumMoniker->Next(1, &pMoniker, &nFetched) == S_OK) {
        IPropertyBag* pPropertyBag;
        LPSTR devname1 = NULL;

        // bind to IPropertyBag
        pMoniker->BindToStorage(0, 0, IID_IPropertyBag, (void**)&pPropertyBag);

        VARIANT varDevPath;
        VARIANT varName;
        VariantInit(&varDevPath);
        VariantInit(&varName);

        // get FriendlyName
        pPropertyBag->Read(L"FriendlyName", &varName, 0);
        std::string strFName = ConvertBSTRToMBS(varName.bstrVal);
        std::cout << strFName << "\r\n"; // show friendly name

        if(SUCCEEDED(pPropertyBag->Read(L"DevicePath", &varName, 0))) // read dev-path
        {
            // The device path is not intended for display.
            //std::cout << "uvcCamCtrl - getKGTCamValue() -  Device path: " << varName.bstrVal << "\r\n";
            strFName = ConvertBSTRToMBS(varName.bstrVal);
            std::cout << "UVCCamCtrl - resetKGTCam() - strFName from Device path: " << strFName << "\r\n";
        }
        else
        {
            std::cout << "UVCCamCtrl - resetKGTCam(): Error occured!!\r\n";
            // TBD: collect error information and return
        }

        if(strFName.compare(strArg0) == 0)
        {
            // Bind Monkier to Filter
            pMoniker->BindToObject(0, 0, IID_IBaseFilter, (void**)&pDeviceFilter);
        }

        // release
        pMoniker->Release();
        pPropertyBag->Release();

        if (pDeviceFilter != NULL) {
            break;
        }
    }
    if (pDeviceFilter != NULL) {
        // create FilterGraph
        CoCreateInstance(CLSID_FilterGraph,
            NULL,
            CLSCTX_INPROC,
            IID_IGraphBuilder,
            (LPVOID*)&pGraphBuilder);

        // create CaptureGraphBuilder2
        CoCreateInstance(CLSID_CaptureGraphBuilder2, NULL, CLSCTX_INPROC,
            IID_ICaptureGraphBuilder2,
            (LPVOID*)&pCaptureGraphBuilder2);

        //HRESULT hr = CoInitialize(0);
        IAMStreamConfig* pConfig = NULL;
        HRESULT hr = pCaptureGraphBuilder2->FindInterface(&PIN_CATEGORY_CAPTURE, 0, pDeviceFilter, IID_IAMStreamConfig, (void**)&pConfig);
        #if 0
        int iCount = 0, iSize = 0;
        hr = pConfig->GetNumberOfCapabilities(&iCount, &iSize);

        // Check the size to make sure we pass in the correct structure.
        if (iSize == sizeof(VIDEO_STREAM_CONFIG_CAPS))
        {
            // Use the video capabilities structure.
            for (int iFormat = 0; iFormat < iCount; iFormat++)
            {
                VIDEO_STREAM_CONFIG_CAPS scc;
                AM_MEDIA_TYPE* pmtConfig;
                hr = pConfig->GetStreamCaps(iFormat, &pmtConfig, (BYTE*)&scc);
                if (SUCCEEDED(hr))
                {
                    /* Examine the format, and possibly use it. */
                    if ((pmtConfig->majortype == MEDIATYPE_Video) &&
                        (pmtConfig->subtype == MEDIASUBTYPE_RGB24) &&
                        (pmtConfig->formattype == FORMAT_VideoInfo) &&
                        (pmtConfig->cbFormat >= sizeof(VIDEOINFOHEADER)) &&
                        (pmtConfig->pbFormat != NULL))
                    {
                        VIDEOINFOHEADER* pVih = (VIDEOINFOHEADER*)pmtConfig->pbFormat;
                        // pVih contains the detailed format information.
                        LONG lWidth = pVih->bmiHeader.biWidth;
                        LONG lHeight = pVih->bmiHeader.biHeight;
                    }
                    if (iFormat == 26) { //2 = '1280x720YUV' YUV, 22 = '1280x800YUV', 26 = '1280x720RGB'
                        hr = pConfig->SetFormat(pmtConfig);
                    }
                    // Delete the media type when you are done.
                    _DeleteMediaType(pmtConfig);
                }
            }
        }
        #endif

        // 1. Get all Video Pro Amp category
        // Query the capture filter for the IAMVideoProcAmp interface.
        IAMVideoProcAmp* pProcAmp = 0;
        hr = pDeviceFilter->QueryInterface(IID_IAMVideoProcAmp, (void**)&pProcAmp);
        if (FAILED(hr)) {
            std::cout << "The device does not support IAMVideoProcAmp" << "\r\n";
            // TBD: return a negative message
        }
        else
        {
            //iSel = 0;  // 0: VideoProcAmp_Brightness
            //iSel = 1;  // 1: VideoProcAmp_Contrast
            //iSel = 2;  // 2: VideoProcAmp_Hue
            //iSel = 3;  // 3: VideoProcAmp_Saturation
            //iSel = 4;  // 4: VideoProcAmp_Sharpness
            //iSel = 5;  // 5: VideoProcAmp_Gamma
            //iSel = 6;  // 6: VideoProcAmp_ColorEnable (Unsupported)
            //iSel = 7;  // 7: VideoProcAmp_WhiteBalance
            //iSel = 8;  // 8: VideoProcAmp_BacklightCompensation
            //iSel = 9;  // 9: VideoProcAmp_Gain        
            for(iSel = 0; iSel < 10; iSel++)
            {
                hr = pProcAmp->GetRange(iSel, &Min, &Max, &Step, &Default, &Flags); // Flag - 1:auto, 2:manual, 3:both
                if(SUCCEEDED(hr))
                {
                    //hr = pProcAmp->Set(iSel, Default, Flags); // reset it
                    hr = pProcAmp->Set(iSel, Default, VideoProcAmp_Flags_Manual); //vv20211112 reset with manual
                }
                else
                {
                    std::cout << "This proAmp item: " << iSel << " is not supported." << "\r\n";
                }
            }
        }
        pProcAmp->Release();

        // 2. Get all Control category
        // Query the capture filter for the IAMCameraControl interface.
        IAMCameraControl* pCameraControl = 0;
        hr = pDeviceFilter->QueryInterface(IID_IAMCameraControl, (void**)&pCameraControl);
        if (FAILED(hr))
        {
            // The device does not support IAMCameraControl
            std::cout << "The device does not support IAMCameraControl" << "\r\n";
        }
        else
        {
            //iSel = 0; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Pan
            //iSel = 1; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Tilt
            //iSel = 2; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Roll
            //iSel = 3; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Zoom
            //iSel = 4; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Exposure
            //iSel = 5; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Iris
            //iSel = 6; hr = pCameraControl->Get(iSel, &Val, &Flags);  // CameraControl_Focus
            //iSel = 19; hr = pCameraControl->Get(iSel, &Val, &Flags); // CameraControl_LowLightCompensation
            for(iSel = 0; iSel < 7; iSel++)
            {
                hr = pCameraControl->GetRange(iSel, &Min, &Max, &Step, &Default, &Flags);
                if(SUCCEEDED(hr))
                {
                    //hr = pCameraControl->Set(iSel, Default, Flags);
                    hr = pCameraControl->Set(iSel, Default, CameraControl_Flags_Manual); // vv20211112 reset with manual
                }
                else
                {
                    std::cout << "This control item:" << iSel << " is not supported." << "\r\n";
                }
                iSel++;
            }
            iSel = 19;
            hr = pCameraControl->GetRange(iSel, &Min, &Max, &Step, &Default, &Flags);
            if(SUCCEEDED(hr))
            {
                pCameraControl->Set(iSel, Default, Flags);
            }
            else
            {
                std::cout << "This control item: " << iSel << " is not supported." << "\r\n";
            }
        }
        pCameraControl->Release();

#if 0
        // set FilterGraph
        pCaptureGraphBuilder2->SetFiltergraph(pGraphBuilder);

        // get MediaControl interface
        pGraphBuilder->QueryInterface(IID_IMediaControl,
            (LPVOID*)&pMediaControl);

        // add device filter to FilterGraph
        pGraphBuilder->AddFilter(pDeviceFilter, L"Device Filter");

        // create Graph
        pCaptureGraphBuilder2->RenderStream(&PIN_CATEGORY_CAPTURE,
            NULL, pDeviceFilter, NULL, NULL);
#endif

        // release
        //pMediaControl->Release();
        pCaptureGraphBuilder2->Release();
        pGraphBuilder->Release();
    }
    // Release object
    pEnumMoniker->Release();
    pCreateDevEnum->Release();

    // finalize COM
    //CoUninitialize();
}

void initKGTCam(const Nan::FunctionCallbackInfo<v8::Value>& info)
{
    std::cout << "UVCCamCtrl - initKGTCam() \r\n";
    //AddTimeStamp ats(std::cout); // Add time stamp to observe
    // initialize COM
    CoInitialize(nullptr);
}

void uninitKGTCam(const Nan::FunctionCallbackInfo<v8::Value>& info)
{
    // finalize COM
    std::cout << "UVCCamCtrl - uninitKGTCam() \r\n";
    CoUninitialize();
}

void Init(v8::Local<v8::Object> exports)
{
	std::cout << " -------------------------------------------------------- \r\n";
	std::cout << " UVCCamCtrl.node Init() - vv202111101428. v0.3 \r\n";
	std::cout << " -------------------------------------------------------- \r\n";

    //AddTimeStamp ats(std::cout); // Add time stamp to observe

    // Get camera parameter range (only 1 item specified)
	exports->Set(Nan::GetCurrentContext(),
                 Nan::New("GetKGTCamRange").ToLocalChecked(), // the exported name
                 Nan::New<v8::FunctionTemplate>(getKGTCamRange)->GetFunction(Nan::GetCurrentContext()).ToLocalChecked());
    // Get camera values (only 1 item specified)
	exports->Set(Nan::GetCurrentContext(),
                 Nan::New("GetKGTCamValue").ToLocalChecked(),
                 Nan::New<v8::FunctionTemplate>(getKGTCamValue)->GetFunction(Nan::GetCurrentContext()).ToLocalChecked());
    // Set camera values (only 1 item specified)
	exports->Set(Nan::GetCurrentContext(),
                 Nan::New("SetKGTCamValue").ToLocalChecked(),
                 Nan::New<v8::FunctionTemplate>(setKGTCamValue)->GetFunction(Nan::GetCurrentContext()).ToLocalChecked());
    // Get USB serial numbers
    exports->Set(Nan::GetCurrentContext(),
                 Nan::New("GetSerialNum").ToLocalChecked(),
                 Nan::New<v8::FunctionTemplate>(getSerialNum)->GetFunction(Nan::GetCurrentContext()).ToLocalChecked());
    // Get 1 camera all values
    exports->Set(Nan::GetCurrentContext(),
                 Nan::New("GetKGTCamAllValue").ToLocalChecked(),
                 Nan::New<v8::FunctionTemplate>(getKGTCamAllValue)->GetFunction(Nan::GetCurrentContext()).ToLocalChecked());
    // Get 1 camera all item range
    exports->Set(Nan::GetCurrentContext(),
                 Nan::New("GetKGTCamAllRange").ToLocalChecked(),
                 Nan::New<v8::FunctionTemplate>(getKGTCamAllRange)->GetFunction(Nan::GetCurrentContext()).ToLocalChecked());
    // Get 1 camera all values
    exports->Set(Nan::GetCurrentContext(),
                 Nan::New("ResetKGTCam").ToLocalChecked(),
                 Nan::New<v8::FunctionTemplate>(resetKGTCam)->GetFunction(Nan::GetCurrentContext()).ToLocalChecked());

    // Init
    exports->Set(Nan::GetCurrentContext(),
                 Nan::New("InitKGTCam").ToLocalChecked(),
                 Nan::New<v8::FunctionTemplate>(initKGTCam)->GetFunction(Nan::GetCurrentContext()).ToLocalChecked());
    // Uninit
    exports->Set(Nan::GetCurrentContext(),
                 Nan::New("UninitKGTCam").ToLocalChecked(),
                 Nan::New<v8::FunctionTemplate>(uninitKGTCam)->GetFunction(Nan::GetCurrentContext()).ToLocalChecked());
}

NODE_MODULE(addon, Init)
}

