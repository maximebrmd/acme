# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class MediaStatus < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::MediaStatusPending }, key: "PENDING"

      member -> { Peal::Types::MediaStatusUploaded }, key: "UPLOADED"

      member -> { Peal::Types::MediaStatusReady }, key: "READY"

      member -> { Peal::Types::MediaStatusRejected }, key: "REJECTED"
    end
  end
end
