# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class AdConnection < Internal::Types::Model
      field :access, -> { Peal::Types::AdAccess }, optional: false, nullable: false

      field :created_at, -> { String }, optional: false, nullable: false, api_name: "createdAt"

      field :expires_at, -> { String }, optional: false, nullable: true, api_name: "expiresAt"

      field :granted_by, -> { String }, optional: false, nullable: true, api_name: "grantedBy"

      field :id, -> { String }, optional: false, nullable: false

      field :may_spend, -> { Internal::Types::Boolean }, optional: false, nullable: false, api_name: "maySpend"

      field :network, -> { Peal::Types::AdNetwork }, optional: false, nullable: false
    end
  end
end
