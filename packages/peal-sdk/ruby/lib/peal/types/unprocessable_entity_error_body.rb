# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UnprocessableEntityErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::FeedAddressRefusedEncoded }, key: "FEED_ADDRESS_REFUSED"

      member -> { Peal::Types::FeedTemplateInvalidEncoded }, key: "FEED_TEMPLATE_INVALID"

      member -> { Peal::Types::FeedUnreadableEncoded }, key: "FEED_UNREADABLE"

      member -> { Peal::Types::UnknownChannelsEncoded }, key: "UNKNOWN_CHANNELS"
    end
  end
end
