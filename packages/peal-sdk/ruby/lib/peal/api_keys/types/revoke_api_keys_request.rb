# frozen_string_literal: true

module Peal
  module APIKeys
    module Types
      class RevokeAPIKeysRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :api_key_id, -> { String }, optional: false, nullable: false, api_name: "apiKeyId"
      end
    end
  end
end
