# frozen_string_literal: true

module Peal
  module PartnerAccount
    module Types
      class OverviewPartnerAccountRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :before, -> { String }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false
      end
    end
  end
end
