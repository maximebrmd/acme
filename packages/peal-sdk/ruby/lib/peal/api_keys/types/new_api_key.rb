# frozen_string_literal: true

module Peal
  module APIKeys
    module Types
      class NewAPIKey < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :expires_in_days, -> { Integer }, optional: true, nullable: false, api_name: "expiresInDays"

        field :name, -> { String }, optional: false, nullable: false

        field :permissions, -> { Internal::Types::Array[Peal::Types::Permission] }, optional: false, nullable: false
      end
    end
  end
end
