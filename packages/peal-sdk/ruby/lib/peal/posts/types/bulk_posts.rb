# frozen_string_literal: true

module Peal
  module Posts
    module Types
      class BulkPosts < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :idempotency_key, -> { String }, optional: true, nullable: false, api_name: "idempotency-key"

        field :posts, -> { Internal::Types::Array[Peal::Types::BulkPost] }, optional: false, nullable: false
      end
    end
  end
end
