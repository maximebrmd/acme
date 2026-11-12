# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class CredentialApplication < Internal::Types::Model
      field :binding, -> { Peal::Types::CredentialBinding }, optional: false, nullable: false

      field :client_id, -> { String }, optional: false, nullable: false, api_name: "clientId"

      field :scopes, -> { Internal::Types::Array[String] }, optional: false, nullable: false
    end
  end
end
