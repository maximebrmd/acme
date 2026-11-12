# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CredentialAPIKey < Internal::Types::Model
      field :expires_at, -> { String }, optional: false, nullable: true, api_name: "expiresAt"

      field :id, -> { String }, optional: false, nullable: false

      field :name, -> { String }, optional: false, nullable: false

      field :permissions, -> { Internal::Types::Array[Peal::Types::Permission] }, optional: false, nullable: false

      field :start, -> { String }, optional: false, nullable: true

      field :workspace, -> { Peal::Types::CredentialWorkspace }, optional: false, nullable: false
    end
  end
end
