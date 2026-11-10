# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module SpecialAdCategory
      extend Peal::Internal::Types::Enum

      NONE = "none"
      HOUSING = "housing"
      EMPLOYMENT = "employment"
      FINANCIAL_PRODUCTS_SERVICES = "financialProductsServices"
      ISSUES_ELECTIONS_POLITICS = "issuesElectionsPolitics"
    end
  end
end
