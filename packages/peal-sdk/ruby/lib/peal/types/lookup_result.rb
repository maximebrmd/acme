# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class LookupResult < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::LookupResultYoutubeVideoCategories }, key: "YOUTUBE_VIDEO_CATEGORIES"

      member -> { Peal::Types::LookupResultYoutubePlaylists }, key: "YOUTUBE_PLAYLISTS"

      member -> { Peal::Types::LookupResultTiktokCreator }, key: "TIKTOK_CREATOR"

      member -> { Peal::Types::LookupResultPinterestBoards }, key: "PINTEREST_BOARDS"

      member -> { Peal::Types::LookupResultPinterestBoardSections }, key: "PINTEREST_BOARD_SECTIONS"
    end
  end
end
