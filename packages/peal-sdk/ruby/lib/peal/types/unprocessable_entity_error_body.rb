# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UnprocessableEntityErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::UnsupportedMediaTypeEncoded }, key: "UNSUPPORTED_MEDIA_TYPE"

      member -> { Peal::Types::MediaTooLargeEncoded }, key: "MEDIA_TOO_LARGE"

      member -> { Peal::Types::AltTextTooLongEncoded }, key: "ALT_TEXT_TOO_LONG"
    end
  end
end
