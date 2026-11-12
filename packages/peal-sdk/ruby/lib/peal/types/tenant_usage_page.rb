# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TenantUsagePage < Internal::Types::Model
      field :next_, -> { String }, optional: false, nullable: true, api_name: "next"

      field :total, -> { Integer }, optional: false, nullable: false

      field :workspaces, -> { Internal::Types::Array[Peal::Types::TenantUsage] }, optional: false, nullable: false
    end
  end
end
