# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AssistantQuotaExceededEncoded < Internal::Types::Model
      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :billing_url, -> { String }, optional: false, nullable: true, api_name: "billingUrl"

      field :daily_limit, -> { Integer }, optional: false, nullable: false, api_name: "dailyLimit"

      field :plan, -> { Peal::Types::Plan }, optional: false, nullable: true

      field :plan_with_room, -> { Peal::Types::PaidPlan }, optional: false, nullable: true, api_name: "planWithRoom"

      field :resets_at, -> { String }, optional: false, nullable: false, api_name: "resetsAt"
    end
  end
end
