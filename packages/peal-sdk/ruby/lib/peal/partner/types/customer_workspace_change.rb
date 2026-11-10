# frozen_string_literal: true

module Peal
  module Partner
    module Types
      class CustomerWorkspaceChange < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :external_id, -> { String }, optional: true, nullable: true, api_name: "externalId"

        field :name, -> { String }, optional: true, nullable: false
      end
    end
  end
end
