<?php

namespace Peal\Types;

enum TextProviderRefusedEncodedReason: string
{
    case SettingsRefused = "settingsRefused";
    case Redirected = "redirected";
    case AddressRefused = "addressRefused";
    case KeyUnreadable = "keyUnreadable";
}
