<?php

namespace Peal\Types;

enum ChannelConnection: string
{
    case InstagramLogin = "instagramLogin";
    case FacebookLogin = "facebookLogin";
    case LinkedinProfile = "linkedinProfile";
    case LinkedinPage = "linkedinPage";
}
