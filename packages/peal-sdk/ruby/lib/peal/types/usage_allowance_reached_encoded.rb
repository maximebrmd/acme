# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class UsageAllowanceReachedEncoded < Internal::Types::Model
      field :tag, -> { Peal::Types::UsageAllowanceReachedEncodedTag }, optional: false, nullable: false, api_name: "_tag"

      field :code, -> { String }, optional: true, nullable: false

      field :message, -> { String }, optional: true, nullable: false

      field :request_id, -> { String }, optional: true, nullable: false, api_name: "requestId"

      field :allowed, -> { Integer }, optional: false, nullable: false

      field :billing_url, -> { String }, optional: false, nullable: false, api_name: "billingUrl"

      field :meter, -> { Peal::Types::Meter }, optional: false, nullable: false

      field :reason, -> { Peal::Types::AllowanceReason }, optional: false, nullable: false

      field :resets_at, -> { String }, optional: false, nullable: false, api_name: "resetsAt"

      field :used, -> { Integer }, optional: false, nullable: false
    end
  end
end
