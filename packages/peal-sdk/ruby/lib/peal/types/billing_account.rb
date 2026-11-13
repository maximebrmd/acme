# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BillingAccount < Internal::Types::Model
      field :billing_workspace_id, -> { String }, optional: false, nullable: false, api_name: "billingWorkspaceId"

      field :billing_workspace_name, -> { String }, optional: false, nullable: true, api_name: "billingWorkspaceName"

      field :id, -> { String }, optional: false, nullable: false

      field :other_workspaces, -> { Internal::Types::Array[Peal::Types::AccountWorkspace] }, optional: false, nullable: false, api_name: "otherWorkspaces"

      field :partner, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :payer, -> { Internal::Types::Boolean }, optional: false, nullable: false

      field :transfer, -> { Peal::Types::BillingTransfer }, optional: false, nullable: true

      field :workspaces, -> { Integer }, optional: false, nullable: false
    end
  end
end
