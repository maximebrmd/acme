# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module TikTokPrivacyLevel
      extend Peal::Internal::Types::Enum

      PUBLIC_TO_EVERYONE = "PUBLIC_TO_EVERYONE"
      MUTUAL_FOLLOW_FRIENDS = "MUTUAL_FOLLOW_FRIENDS"
      FOLLOWER_OF_CREATOR = "FOLLOWER_OF_CREATOR"
      SELF_ONLY = "SELF_ONLY"
    end
  end
end
