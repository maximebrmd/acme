# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UploadTarget < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::UploadTargetSingle }, key: "SINGLE"

      member -> { Peal::Types::UploadTargetMultipart }, key: "MULTIPART"
    end
  end
end
