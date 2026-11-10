# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ReviewSettings < Internal::Types::Model
      field :approval_policy, -> { Peal::Types::ApprovalPolicy }, optional: false, nullable: false, api_name: "approvalPolicy"
    end
  end
end
