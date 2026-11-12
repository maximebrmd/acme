# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEventFeedStopped < Internal::Types::Model
      field :feed_id, -> { String }, optional: false, nullable: false, api_name: "feedId"

      field :reason, -> { Peal::Types::FeedStopReason }, optional: false, nullable: false
    end
  end
end
