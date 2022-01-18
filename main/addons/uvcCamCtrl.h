#include <nan.h>
#include <iostream>
#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>
#include <Windows.h>
#include <dshow.h>

#include <string>
#include <vector>
#include <setupapi.h> 
#include <hidsdi.h>
#include <hidpi.h>
#include <strmif.h>
#include <node.h>
#include "iSerialNum.h"

#define MAX_STRING_SIZE 256

using namespace std;

namespace uvcCamCtrl
{
static std::string reSortDevPath(std::string inputStr);
}