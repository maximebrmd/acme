# frozen_string_literal: true

module Peal
  module Partner
    module Types
      class ListWorkspacesPartnerRequest < Internal::Types::Model
        field :before, -> { String }, optional: true, nullable: false

        field :external_id, -> { String }, optional: true, nullable: false, api_name: "externalId"

        field :limit, -> { String }, optional: true, nullable: false

        field :name, -> { String }, optional: true, nullable: false
      end
    end
  end
end
