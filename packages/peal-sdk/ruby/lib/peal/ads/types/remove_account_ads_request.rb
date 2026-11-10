# frozen_string_literal: true

module Peal
  module Ads
    module Types
      class RemoveAccountAdsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :account_id, -> { String }, optional: false, nullable: false, api_name: "accountId"
      end
    end
  end
end
