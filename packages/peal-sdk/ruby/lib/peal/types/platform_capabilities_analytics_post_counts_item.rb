# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PlatformCapabilitiesAnalyticsPostCountsItem
      extend Peal::Internal::Types::Enum

      LIKES = "likes"
      REPOSTS = "reposts"
      REPLIES = "replies"
      QUOTES = "quotes"
      IMPRESSIONS = "impressions"
      CLICKS = "clicks"
      REACH = "reach"
      SAVES = "saves"
    end
  end
end
