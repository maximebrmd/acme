<?php

namespace Peal\Types;

enum LookupName: string
{
    case YoutubeVideoCategories = "youtubeVideoCategories";
    case YoutubePlaylists = "youtubePlaylists";
    case TiktokCreator = "tiktokCreator";
    case PinterestBoards = "pinterestBoards";
    case PinterestBoardSections = "pinterestBoardSections";
    case LinkedinOrganizations = "linkedinOrganizations";
}
