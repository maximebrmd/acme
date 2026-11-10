# frozen_string_literal: true

module Peal
  module Ads
    module Types
      class AuditTrailAdsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :cursor, -> { String }, optional: true, nullable: false
      end
    end
  end
end
