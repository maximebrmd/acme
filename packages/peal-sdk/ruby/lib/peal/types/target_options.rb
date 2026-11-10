# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    # What a post says on a channel that only its platform knows, tagged by `platform`. Platforms without options take
    # none.
    class TargetOptions < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :platform

      member -> { Peal::Types::YouTubeOptions }, key: "YOUTUBE"

      member -> { Peal::Types::TikTokOptions }, key: "TIKTOK"

      member -> { Peal::Types::GoogleBusinessOptions }, key: "GOOGLE_BUSINESS"
    end
  end
end
