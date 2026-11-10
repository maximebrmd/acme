# frozen_string_literal: true

module Peal
  module PartnerAccount
    module Types
      class PartnerChange < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :logo_url, -> { String }, optional: true, nullable: true, api_name: "logoUrl"

        field :name, -> { String }, optional: true, nullable: false

        field :return_origins, -> { Internal::Types::Array[String] }, optional: true, nullable: false, api_name: "returnOrigins"
      end
    end
  end
end
