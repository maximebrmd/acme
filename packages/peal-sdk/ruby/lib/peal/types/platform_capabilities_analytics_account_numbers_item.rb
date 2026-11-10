# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PlatformCapabilitiesAnalyticsAccountNumbersItem
      extend Peal::Internal::Types::Enum

      FOLLOWERS = "followers"
      FOLLOWING = "following"
      POSTS = "posts"
      VIEWS = "views"
      REACH = "reach"
    end
  end
end
