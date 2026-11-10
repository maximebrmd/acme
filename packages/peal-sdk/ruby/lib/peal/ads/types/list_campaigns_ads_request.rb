# frozen_string_literal: true

module Peal
  module Ads
    module Types
      class ListCampaignsAdsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :account_id, -> { String }, optional: false, nullable: false, api_name: "accountId"

        field :from, -> { String }, optional: true, nullable: false

        field :to, -> { String }, optional: true, nullable: false
      end
    end
  end
end
