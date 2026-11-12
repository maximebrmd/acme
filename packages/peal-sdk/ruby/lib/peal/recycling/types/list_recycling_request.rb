# frozen_string_literal: true

module Peal
  module Recycling
    module Types
      class ListRecyclingRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :cursor, -> { String }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false

        field :status, -> { Peal::Types::RecyclingStatus }, optional: true, nullable: false
      end
    end
  end
end
