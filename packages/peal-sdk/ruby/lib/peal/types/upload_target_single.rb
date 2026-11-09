# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UploadTargetSingle < Internal::Types::Model
      field :expires_at, -> { String }, optional: false, nullable: false, api_name: "expiresAt"

      field :request, -> { Peal::Types::SignedRequest }, optional: false, nullable: false
    end
  end
end
