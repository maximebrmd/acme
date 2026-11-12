# frozen_string_literal: true

module Peal
  module ShortLinks
    module Types
      class ShortLinkSettings < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :by_default, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "byDefault"
      end
    end
  end
end
