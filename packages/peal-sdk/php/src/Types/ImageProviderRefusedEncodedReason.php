<?php

namespace Peal\Types;

enum ImageProviderRefusedEncodedReason: string
{
    case SettingsRefused = "settingsRefused";
    case AddressRefused = "addressRefused";
    case KeyUnreadable = "keyUnreadable";
}
