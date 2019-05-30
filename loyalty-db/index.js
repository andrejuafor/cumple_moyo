'use strict'

const AccountClass = require('./class/account')
const LicenseClass = require('./class/license')
const OfficeClass = require('./class/office')
const TransactionClass = require('./class/transaction')
const UserClass = require('./class/user')
const TransactionDetailClass = require('./class/transaction_detail')
const CuponClass = require('./class/cupon')
const CuponSerieClass = require('./class/cupon_serie')
const CuponCondClass = require('./class/cupon_cond')
const OfficeAccountClass = require('./class/office_account')
const BenefitClass = require('./class/benefit')
const AccountCuponClass = require('./class/account_cupon')
const BenefitRegistryClass = require('./class/benefit_registry')
const AntiFRaudClass = require('./class/anti_fraud')
const CategoryClass = require('./class/category')
const BenefitAccountClass = require('./class/benefit_account')
const AccountReferenceClass = require('./class/account_reference')
const ReferenceAccountClass = require('./class/reference_account')
const PrizeAccountClass = require('./class/prize_account')
const LoginClass = require('./class/login')
const DailyBalanceClass = require('./class/daily_balance')
const UserProfileClass = require('./class/user_profile')
const TransactionDeleteClass = require('./class/transaction_delete')
const MerchantClass = require('./class/merchant')
const ConsultaLibreClass = require('./class/consulta_libre')
const MailingClass = require('./class/mailing')
const MailingToClass = require('./class/mailing_to')
const ListaNegraClass = require('./class/lista_negra')
const ReportClass = require('./class/reports')

const Account = new AccountClass()
const License = new LicenseClass()
const Office = new OfficeClass()
const Transaction = new TransactionClass()
const User = new UserClass()
const TransactionDetail = new TransactionDetailClass()
const Cupon = new CuponClass()
const CuponSerie = new CuponSerieClass()
const CuponCond = new CuponCondClass()
const OfficeAccount = new OfficeAccountClass()
const Benefit = new BenefitClass()
const AccountCupon = new AccountCuponClass()
const BenefitRegistry = new BenefitRegistryClass()
const AntiFraud = new AntiFRaudClass()
const Category = new CategoryClass()
const BenefitAccount = new BenefitAccountClass()
const AccountReference = new AccountReferenceClass()
const ReferenceAccount = new ReferenceAccountClass()
const PrizeAccount = new PrizeAccountClass()
const Login = new LoginClass()
const DailyBalance = new DailyBalanceClass()
const UserProfile = new UserProfileClass()
const TransactionDelete = new TransactionDeleteClass()
const Merchant = new MerchantClass()
const ConsultaLibre = new ConsultaLibreClass()
const Mailing = new MailingClass()
const MailingTo = new MailingToClass()
const ListaNegra = new ListaNegraClass()
const Report = new ReportClass()


module.exports = {
  Account,
  License,
  Office,
  Transaction,
  User,
  TransactionDetail,
  Cupon,
  CuponSerie,
  CuponCond,
  OfficeAccount,
  Benefit,
  AccountCupon,
  BenefitRegistry,
  AntiFraud,
  Category,
  BenefitAccount,
  AccountReference,
  ReferenceAccount,
  PrizeAccount,
  Login,
  DailyBalance,
  UserProfile,
  TransactionDelete,
  Merchant,
  ConsultaLibre,
  Mailing,
  MailingTo,
  ListaNegra,
  Report
}
