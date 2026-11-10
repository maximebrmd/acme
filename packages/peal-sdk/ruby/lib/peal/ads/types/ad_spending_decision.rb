# frozen_string_literal: true

module Peal
  module Ads
    module Types
      class AdSpendingDecision < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :account_id, -> { String }, optional: false, nullable: false, api_name: "accountId"

        field :enabled, -> { Internal::Types::Boolean }, optional: false, nullable: false

        field :monthly_ceiling, -> { Peal::Types::AdMoney }, optional: true, nullable: false, api_name: "monthlyCeiling"
      end
    end
  end
end
