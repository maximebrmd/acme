# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UnprocessableEntityErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::UnknownChannelsEncoded }, key: "UNKNOWN_CHANNELS"

      member -> { Peal::Types::PostContentInvalidEncoded }, key: "POST_CONTENT_INVALID"
    end
  end
end
