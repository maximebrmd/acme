# frozen_string_literal: true

module Peal
  module Recycling
    module Types
      class NewRecyclingRule < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :count, -> { Integer }, optional: true, nullable: false

        field :every, -> { Peal::Types::RecyclingInterval }, optional: false, nullable: false

        field :post_id, -> { String }, optional: false, nullable: false, api_name: "postId"

        field :queue_id, -> { String }, optional: true, nullable: false, api_name: "queueId"

        field :until_, -> { String }, optional: true, nullable: false, api_name: "until"

        field :variants, -> { Internal::Types::Array[Peal::Types::RecyclingVariant] }, optional: true, nullable: false
      end
    end
  end
end
