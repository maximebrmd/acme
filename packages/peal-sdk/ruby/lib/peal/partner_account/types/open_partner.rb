# frozen_string_literal: true

module Peal
  module PartnerAccount
    module Types
      class OpenPartner < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :name, -> { String }, optional: false, nullable: false
      end
    end
  end
end
