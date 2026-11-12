# frozen_string_literal: true

module Peal
  module Partner
    module Types
      class OverviewPartnerRequest < Internal::Types::Model
        field :before, -> { String }, optional: true, nullable: false

        field :limit, -> { String }, optional: true, nullable: false
      end
    end
  end
end
