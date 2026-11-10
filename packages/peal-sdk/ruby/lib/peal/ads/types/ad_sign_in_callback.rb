# frozen_string_literal: true

module Peal
  module Ads
    module Types
      class AdSignInCallback < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :network, -> { Peal::Types::AdNetwork }, optional: false, nullable: false

        field :code, -> { String }, optional: true, nullable: false

        field :error, -> { String }, optional: true, nullable: false

        field :state, -> { String }, optional: false, nullable: false
      end
    end
  end
end
