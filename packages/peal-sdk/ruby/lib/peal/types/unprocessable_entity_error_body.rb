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

      member -> { Peal::Types::MediaSourceNotPublicEncoded }, key: "MEDIA_SOURCE_NOT_PUBLIC"

      member -> { Peal::Types::MediaSourceUnreachableEncoded }, key: "MEDIA_SOURCE_UNREACHABLE"

      member -> { Peal::Types::UploadRejectedEncoded }, key: "UPLOAD_REJECTED"
    end
  end
end
