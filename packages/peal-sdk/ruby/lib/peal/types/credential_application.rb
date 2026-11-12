# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CredentialApplication < Internal::Types::Model
      field :client_id, -> { String }, optional: false, nullable: false, api_name: "clientId"

      field :scopes, -> { Internal::Types::Array[String] }, optional: false, nullable: false

      field :workspace, -> { Peal::Types::CredentialBoundWorkspace }, optional: false, nullable: true
    end
  end
end
