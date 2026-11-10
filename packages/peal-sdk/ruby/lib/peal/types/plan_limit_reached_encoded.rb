# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PlanLimitReachedEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::PlanLimitReachedEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :allowed, -> { Integer }, optional: false, nullable: false

      field :billing_url, -> { String }, optional: false, nullable: false, api_name: "billingUrl"

      field :limit, -> { Peal::Types::PlanLimit }, optional: false, nullable: false

      field :plan, -> { Peal::Types::Plan }, optional: false, nullable: false

      field :plan_with_room, -> { Peal::Types::PaidPlan }, optional: false, nullable: true, api_name: "planWithRoom"

      field :used, -> { Integer }, optional: false, nullable: false
    end
  end
end
