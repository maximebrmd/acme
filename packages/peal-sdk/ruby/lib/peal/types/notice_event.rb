# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class NoticeEvent < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::NoticeEventPostPublished }, key: "POST_PUBLISHED"

      member -> { Peal::Types::NoticeEventPostFailed }, key: "POST_FAILED"

      member -> { Peal::Types::NoticeEventPostUnconfirmed }, key: "POST_UNCONFIRMED"

      member -> { Peal::Types::NoticeEventChannelReconnectRequired }, key: "CHANNEL_RECONNECT_REQUIRED"

      member -> { Peal::Types::NoticeEventChannelReconnectSoon }, key: "CHANNEL_RECONNECT_SOON"
    end
  end
end
