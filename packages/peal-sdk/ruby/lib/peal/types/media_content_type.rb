# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module MediaContentType
      extend Peal::Internal::Types::Enum

      IMAGE_GIF = "image/gif"
      IMAGE_JPEG = "image/jpeg"
      IMAGE_PNG = "image/png"
      IMAGE_WEBP = "image/webp"
      VIDEO_MP4 = "video/mp4"
      VIDEO_QUICKTIME = "video/quicktime"
      APPLICATION_PDF = "application/pdf"
    end
  end
end
