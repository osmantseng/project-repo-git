{
  "targets": [
    {
      "target_name": "UVCCamCtrl",
      "sources": [ "addons/uvcCamCtrl.cpp", "addons/iSerialNum.cpp" ],
      "conditions": [
        ["OS==\"win\"", {
            "include_dirs": [
                "<!(node -e \"require('nan')\")"
            ],
            'defines': [
                '_WIN32_WINNT=0x0601'
            ],
            'msvs_disabled_warnings': [ 4244,4005,4506,4345,4804,4805 ],
            'inputs': [
              'kernel32.lib;user32.lib;gdi32.lib;winspool.lib;comdlg32.lib;advapi32.lib;shell32.lib;ole32.lib;oleaut32.lib;uuid.lib;odbc32.lib;odbccp32.lib;Setupapi.lib;Hid.lib;%(AdditionalDependencies)'
            ],
            'msvs_settings': {
                'VCLinkerTool': {
                    'AdditionalLibraryDirectories': ['C:/boost_1_67_0/stage/lib'],
                },
                "VCCLCompilerTool": {
                    "ExceptionHandling": 1,
                    'RuntimeTypeInfo': 'true'
                }
            }    
        },
        ],
        ["OS==\"mac\"", {
            "include_dirs": [
                "/usr/local/include",
                "<!(node -e \"require('nan')\")"
            ],
            "cflags_cc!": [ "-fno-rtti", "-fno-exceptions" ],
            "cflags!": [ "-fno-exceptions" ],
            "xcode_settings": {
                "OTHER_CPLUSPLUSFLAGS" : ["-std=c++14","-stdlib=libc++", "-v", "-arch x86_64", "-arch arm64"],
                "OTHER_LDFLAGS": ["-stdlib=libc++", "-arch x86_64", "-arch arm64"],
                "MACOSX_DEPLOYMENT_TARGET": "10.11",
                "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
                "GCC_ENABLE_CPP_RTTI": "YES"
            }
        },
        ],
      ],
    }
  ]
}