# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ChannelPlatform
      extend Peal::Internal::Types::Enum

      X = "x"
      LINKEDIN = "linkedin"
      BLUESKY = "bluesky"
      MASTODON = "mastodon"
      THREADS = "threads"
      INSTAGRAM = "instagram"
      FACEBOOK = "facebook"
      TIKTOK = "tiktok"
      YOUTUBE = "youtube"
      PINTEREST = "pinterest"
      GOOGLE_BUSINESS = "googleBusiness"
      WORDPRESS = "wordpress"
    end
  end
end
