# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module LookupName
      extend Peal::Internal::Types::Enum

      YOUTUBE_VIDEO_CATEGORIES = "youtubeVideoCategories"
      YOUTUBE_PLAYLISTS = "youtubePlaylists"
      TIKTOK_CREATOR = "tiktokCreator"
      PINTEREST_BOARDS = "pinterestBoards"
      PINTEREST_BOARD_SECTIONS = "pinterestBoardSections"
    end
  end
end
