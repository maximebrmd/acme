# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CredentialPartnerKey < Internal::Types::Model
      field :expires_at, -> { String }, optional: false, nullable: true, api_name: "expiresAt"

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :partner, -> { Peal::Types::CredentialPartner }, optional: false, nullable: false

      field :permissions, -> { Internal::Types::Array[Peal::Types::Permission] }, optional: false, nullable: false

      field :scopes, -> { Internal::Types::Array[Peal::Types::PartnerScope] }, optional: false, nullable: false

      field :start, -> { String }, optional: false, nullable: false
    end
  end
end
