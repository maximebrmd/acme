# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class BillingAccountsUsage < Internal::Types::Model
      field :account_days, -> { Integer }, optional: false, nullable: true, api_name: "accountDays"

      field :connected, -> { Integer }, optional: false, nullable: false

      field :estimate, -> { Peal::Types::Money }, optional: false, nullable: true

      field :next_account, -> { Peal::Types::Money }, optional: false, nullable: true, api_name: "nextAccount"

      field :pooled, -> { Integer }, optional: false, nullable: false
    end
  end
end
