<?php

namespace Peal\Types;

enum ImageProviderRefusedEncodedReason: string
{
    case SettingsRefused = "settingsRefused";
    case Redirected = "redirected";
    case AddressRefused = "addressRefused";
    case KeyUnreadable = "keyUnreadable";
}
